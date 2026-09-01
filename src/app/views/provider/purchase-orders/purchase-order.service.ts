import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IOrganizationTax } from '@views/application/organization/organization';
import { IPurchaseOrder } from './purchase-order';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  private readonly purchaseOrderUrl = environment.API_URL + 'purchaseorders';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedPoIdSource = new BehaviorSubject<number>(0);
  private readonly draftOrderSource = new BehaviorSubject<IPurchaseOrder | null>(
    null
  );
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);
  private readonly taxCatalogSource = new BehaviorSubject<IOrganizationTax[]>(
    []
  );
  readonly taxCatalog$ = this.taxCatalogSource.asObservable();

  readonly emptyPurchaseOrder: IPurchaseOrder = {
    poId: 0,
    poNumber: '',
    providerId: null,
    providerCode: '',
    providerName: '',
    issueDate: null,
    deliveryDate: null,
    comment: '',
    statusName: '',
    organizationId: 0,
    lines: [],
    taxes: [],
    discounts: [],
  };

  purchaseOrders$!: Observable<IPurchaseOrder[]>;
  selectedPoId$ = this.selectedPoIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  purchaseOrderSelected$!: Observable<IPurchaseOrder>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.purchaseOrders$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IPurchaseOrder[]);
            }
            return this.http
              .get<IApiResponse<IPurchaseOrder[]>>(
                `${this.purchaseOrderUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IPurchaseOrder[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.purchaseOrderSelected$ = combineLatest([
      this.selectedPoIdSource,
      this.draftOrderSource,
    ]).pipe(
      switchMap(([poId, draft]) => {
        if (poId <= 0) {
          return of(draft ?? this.createEmptyPurchaseOrder());
        }
        return this.getPurchaseOrderDocument(poId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe((organizationId) => {
        this.draftOrderSource.next(null);
        this.setSelectedPoId(0);
        this.enableForm(false);
        this.loadTaxCatalog(organizationId);
      });
  }

  taxRateFor(
    taxCode: string | null | undefined,
    issueDate: Date | string | null | undefined
  ): number | null {
    const rateType = this.normalizedRateType(taxCode);
    const issueKey = this.toDateKey(issueDate);
    const rows = this.taxCatalogSource.value.filter((tax) => {
      return this.normalizedRateType(tax.rateType) === rateType;
    });
    const dated = issueKey
      ? rows.filter((tax) => {
          const fromKey = this.toDateKey(tax.taxDateFrom);
          return !!fromKey && fromKey <= issueKey;
        })
      : rows;
    const pool = dated.length ? dated : rows;
    if (!pool.length) {
      return rateType === 'E' ? 0 : null;
    }
    pool.sort(
      (a, b) =>
        this.toDateKey(b.taxDateFrom).localeCompare(this.toDateKey(a.taxDateFrom))
    );
    const rate = Number(pool[0].rate);
    return Number.isFinite(rate) ? rate : rateType === 'E' ? 0 : null;
  }

  isExemptRateType(taxCode: string | null | undefined): boolean {
    const code = (taxCode ?? '').toString().trim().toUpperCase();
    return !code || code === 'E';
  }

  normalizedRateType(taxCode: string | null | undefined): string {
    if (this.isExemptRateType(taxCode)) {
      return 'E';
    }
    return (taxCode ?? '').toString().trim().charAt(0).toUpperCase();
  }

  setSelectedPoId(poId: number): void {
    if ((poId ?? 0) > 0) {
      this.draftOrderSource.next(null);
    }
    this.selectedPoIdSource.next(poId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const poId = this.selectedPoIdSource.value;
    this.enableForm(false);
    if (poId <= 0) {
      this.draftOrderSource.next(null);
      return;
    }
    this.selectedPoIdSource.next(0);
    this.selectedPoIdSource.next(poId);
  }

  beginNewPurchaseOrder(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextPoNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de orden de compra',
            toastType.warning
          );
          return;
        }
        this.draftOrderSource.next({
          ...this.createEmptyPurchaseOrder(),
          poNumber: code,
        });
        this.setSelectedPoId(0);
        this.enableForm(true);
      });
  }

  getNextPoNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.purchaseOrderUrl}/next/${organizationId}`
      )
      .pipe(
        map((data) => {
          const raw = data.result;
          if (typeof raw === 'string') {
            return raw.trim();
          }
          return (raw?.code ?? '').trim();
        }),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of('');
        })
      );
  }

  createEmptyPurchaseOrder(): IPurchaseOrder {
    const today = new Date();
    return {
      ...this.emptyPurchaseOrder,
      issueDate: today,
      deliveryDate: today,
      organizationId: this.currentOrganizationId,
      lines: [],
      taxes: [],
      discounts: [],
    };
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  savePurchaseOrder(order: IPurchaseOrder): Observable<number> {
    const request$ =
      (order.poId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.purchaseOrderUrl, order, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.purchaseOrderUrl, order, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Orden de compra guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedPoIdSource.next(0);
          this.selectedPoIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar la orden de compra',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deletePurchaseOrder(item: IPurchaseOrder): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.purchaseOrderUrl}/${item.poId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Orden de compra eliminada',
              toastType.success
            );
            this.setSelectedPoId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar la orden de compra',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getPurchaseOrderDocument(poId: number): Observable<IPurchaseOrder> {
    return this.http
      .get<IApiResponse<IPurchaseOrder>>(
        `${this.purchaseOrderUrl}/document/${poId}`
      )
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyPurchaseOrder());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyPurchaseOrder());
        })
      );
  }

  private loadTaxCatalog(organizationId: number): void {
    if (organizationId <= 0) {
      this.taxCatalogSource.next([]);
      return;
    }
    this.http
      .get<IApiResponse<IOrganizationTax[]>>(
        `${environment.API_URL}organization/taxes/${organizationId}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(() => of([] as IOrganizationTax[]))
      )
      .subscribe((rows) => this.taxCatalogSource.next(rows));
  }

  private toDateKey(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      const iso = value.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
    }
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return '';
    }
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  private normalizeDocument(row: IPurchaseOrder | null | undefined): IPurchaseOrder {
    if (!row) {
      return this.createEmptyPurchaseOrder();
    }
    return {
      ...this.emptyPurchaseOrder,
      ...row,
      poId: Number(row.poId) || 0,
      lines: row.lines ?? [],
      taxes: row.taxes ?? [],
      discounts: row.discounts ?? [],
    };
  }
}
