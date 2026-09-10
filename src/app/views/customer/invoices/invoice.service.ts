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
import { IInvoice } from './invoice';

@Injectable({
  providedIn: 'root',
})
export class InvoiceService {
  private readonly invoiceUrl = environment.API_URL + 'salesinvoices';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedInvoiceIdSource = new BehaviorSubject<number>(0);
  private readonly draftInvoiceSource = new BehaviorSubject<IInvoice | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyInvoice: IInvoice = {
    invoiceId: 0,
    invoiceNumber: '',
    invoiceSeriesCode: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    billingPrice: '',
    issueDate: null,
    dueDate: null,
    warehouseId: null,
    reference: '',
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

  invoices$!: Observable<IInvoice[]>;
  selectedInvoiceId$ = this.selectedInvoiceIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  invoiceSelected$!: Observable<IInvoice>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.invoices$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IInvoice[]);
            }
            return this.http
              .get<IApiResponse<IInvoice[]>>(
                `${this.invoiceUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IInvoice[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.invoiceSelected$ = combineLatest([
      this.selectedInvoiceIdSource,
      this.draftInvoiceSource,
    ]).pipe(
      switchMap(([invoiceId, draft]) => {
        if (invoiceId <= 0) {
          return of(draft ?? this.createEmptyInvoice());
        }
        return this.getInvoiceDocument(invoiceId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftInvoiceSource.next(null);
        this.setSelectedInvoiceId(0);
        this.enableForm(false);
      });
  }

  setSelectedInvoiceId(invoiceId: number): void {
    if ((invoiceId ?? 0) > 0) {
      this.draftInvoiceSource.next(null);
    }
    this.selectedInvoiceIdSource.next(invoiceId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const invoiceId = this.selectedInvoiceIdSource.value;
    this.enableForm(false);
    if (invoiceId <= 0) {
      this.draftInvoiceSource.next(null);
      return;
    }
    this.selectedInvoiceIdSource.next(0);
    this.selectedInvoiceIdSource.next(invoiceId);
  }

  beginNewInvoice(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextInvoiceNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de factura',
            toastType.warning
          );
          return;
        }
        this.draftInvoiceSource.next({
          ...this.createEmptyInvoice(),
          invoiceNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedInvoiceId(0);
        this.enableForm(true);
      });
  }

  getNextInvoiceNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.invoiceUrl}/next/${organizationId}`
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

  createEmptyInvoice(): IInvoice {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyInvoice,
      issueDate: today,
      dueDate: today,
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

  saveInvoice(quote: IInvoice): Observable<number> {
    const request$ =
      (quote.invoiceId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.invoiceUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.invoiceUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Factura guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedInvoiceIdSource.next(0);
          this.selectedInvoiceIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar factura',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteInvoice(item: IInvoice): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.invoiceUrl}/${item.invoiceId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Factura eliminada',
              toastType.success
            );
            this.setSelectedInvoiceId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar factura',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getInvoiceDocument(invoiceId: number): Observable<IInvoice> {
    return this.http
      .get<IApiResponse<IInvoice>>(`${this.invoiceUrl}/document/${invoiceId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyInvoice());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyInvoice());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: IInvoice | null | undefined): IInvoice {
    if (!row) {
      return this.createEmptyInvoice();
    }
    return {
      ...this.emptyInvoice,
      ...row,
      invoiceId: Number(row.invoiceId) || 0,
      warehouseId: Number(row.warehouseId) || null,
      reference: row.reference ?? '',
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
