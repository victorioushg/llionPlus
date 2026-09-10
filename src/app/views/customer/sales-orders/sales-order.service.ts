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
import { ISalesOrder } from './sales-order';

@Injectable({
  providedIn: 'root',
})
export class SalesOrderService {
  private readonly salesOrderUrl = environment.API_URL + 'salesorders';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedSalesOrderIdSource = new BehaviorSubject<number>(0);
  private readonly draftSalesOrderSource = new BehaviorSubject<ISalesOrder | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptySalesOrder: ISalesOrder = {
    salesOrderId: 0,
    salesOrderNumber: '',
    salesOrderSeriesCode: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    billingPrice: '',
    issueDate: null,
    dueDate: null,
    deliveryDate: null,
    comment: '',
    salesmanId: null,
    salesmanName: '',
    accountId: null,
    classId: null,
    statusName: '',
    organizationId: 0,
    lines: [],
    taxes: [],
    discounts: [],
  };

  salesOrders$!: Observable<ISalesOrder[]>;
  selectedSalesOrderId$ = this.selectedSalesOrderIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  salesOrderSelected$!: Observable<ISalesOrder>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.salesOrders$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as ISalesOrder[]);
            }
            return this.http
              .get<IApiResponse<ISalesOrder[]>>(
                `${this.salesOrderUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as ISalesOrder[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.salesOrderSelected$ = combineLatest([
      this.selectedSalesOrderIdSource,
      this.draftSalesOrderSource,
    ]).pipe(
      switchMap(([salesOrderId, draft]) => {
        if (salesOrderId <= 0) {
          return of(draft ?? this.createEmptySalesOrder());
        }
        return this.getSalesOrderDocument(salesOrderId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftSalesOrderSource.next(null);
        this.setSelectedSalesOrderId(0);
        this.enableForm(false);
      });
  }

  setSelectedSalesOrderId(salesOrderId: number): void {
    if ((salesOrderId ?? 0) > 0) {
      this.draftSalesOrderSource.next(null);
    }
    this.selectedSalesOrderIdSource.next(salesOrderId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const salesOrderId = this.selectedSalesOrderIdSource.value;
    this.enableForm(false);
    if (salesOrderId <= 0) {
      this.draftSalesOrderSource.next(null);
      return;
    }
    this.selectedSalesOrderIdSource.next(0);
    this.selectedSalesOrderIdSource.next(salesOrderId);
  }

  beginNewSalesOrder(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextSalesOrderNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de pedido',
            toastType.warning
          );
          return;
        }
        this.draftSalesOrderSource.next({
          ...this.createEmptySalesOrder(),
          salesOrderNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedSalesOrderId(0);
        this.enableForm(true);
      });
  }

  getNextSalesOrderNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.salesOrderUrl}/next/${organizationId}`
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

  createEmptySalesOrder(): ISalesOrder {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptySalesOrder,
      issueDate: today,
      dueDate: today,
      deliveryDate: today,
      statusName: 'Pendiente',
      status: 0,
      organizationId: this.currentOrganizationId,
      lines: [],
      taxes: [],
      discounts: [],
    };
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  saveSalesOrder(quote: ISalesOrder): Observable<number> {
    const request$ =
      (quote.salesOrderId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.salesOrderUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.salesOrderUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Pedido guardado',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedSalesOrderIdSource.next(0);
          this.selectedSalesOrderIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar pedido',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteSalesOrder(item: ISalesOrder): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.salesOrderUrl}/${item.salesOrderId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Pedido eliminado',
              toastType.success
            );
            this.setSelectedSalesOrderId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar pedido',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getSalesOrderDocument(salesOrderId: number): Observable<ISalesOrder> {
    return this.http
      .get<IApiResponse<ISalesOrder>>(`${this.salesOrderUrl}/document/${salesOrderId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptySalesOrder());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptySalesOrder());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: ISalesOrder | null | undefined): ISalesOrder {
    if (!row) {
      return this.createEmptySalesOrder();
    }
    return {
      ...this.emptySalesOrder,
      ...row,
      salesOrderId: Number(row.salesOrderId) || 0,
      deliveryDate: row.deliveryDate ?? null,
      customerId: Number(row.customerId) || null,
      salesmanId: Number(row.salesmanId) || null,
      accountId: Number(row.accountId) || null,
      classId: Number(row.classId) || null,
      lines: row.lines ?? [],
      taxes: row.taxes ?? [],
      discounts: row.discounts ?? [],
    };
  }
}
