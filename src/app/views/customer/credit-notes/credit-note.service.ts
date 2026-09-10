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
import { ICreditNote } from './credit-note';

@Injectable({
  providedIn: 'root',
})
export class CreditNoteService {
  private readonly creditNoteUrl = environment.API_URL + 'salescreditnotes';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedCreditNoteIdSource = new BehaviorSubject<number>(0);
  private readonly draftCreditNoteSource = new BehaviorSubject<ICreditNote | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyCreditNote: ICreditNote = {
    creditNoteId: 0,
    creditNoteNumber: '',
    creditNoteSeriesCode: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    billingPrice: '',
    issueDate: null,
    dueDate: null,
    warehouseId: null,
    reference: '',
    invoiceId: null,
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

  creditNotes$!: Observable<ICreditNote[]>;
  selectedCreditNoteId$ = this.selectedCreditNoteIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  creditNoteSelected$!: Observable<ICreditNote>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.creditNotes$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as ICreditNote[]);
            }
            return this.http
              .get<IApiResponse<ICreditNote[]>>(
                `${this.creditNoteUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as ICreditNote[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.creditNoteSelected$ = combineLatest([
      this.selectedCreditNoteIdSource,
      this.draftCreditNoteSource,
    ]).pipe(
      switchMap(([creditNoteId, draft]) => {
        if (creditNoteId <= 0) {
          return of(draft ?? this.createEmptyCreditNote());
        }
        return this.getCreditNoteDocument(creditNoteId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftCreditNoteSource.next(null);
        this.setSelectedCreditNoteId(0);
        this.enableForm(false);
      });
  }

  setSelectedCreditNoteId(creditNoteId: number): void {
    if ((creditNoteId ?? 0) > 0) {
      this.draftCreditNoteSource.next(null);
    }
    this.selectedCreditNoteIdSource.next(creditNoteId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const creditNoteId = this.selectedCreditNoteIdSource.value;
    this.enableForm(false);
    if (creditNoteId <= 0) {
      this.draftCreditNoteSource.next(null);
      return;
    }
    this.selectedCreditNoteIdSource.next(0);
    this.selectedCreditNoteIdSource.next(creditNoteId);
  }

  beginNewCreditNote(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextCreditNoteNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de nota de crédito',
            toastType.warning
          );
          return;
        }
        this.draftCreditNoteSource.next({
          ...this.createEmptyCreditNote(),
          creditNoteNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedCreditNoteId(0);
        this.enableForm(true);
      });
  }

  getNextCreditNoteNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.creditNoteUrl}/next/${organizationId}`
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

  createEmptyCreditNote(): ICreditNote {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyCreditNote,
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

  saveCreditNote(quote: ICreditNote): Observable<number> {
    const request$ =
      (quote.creditNoteId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.creditNoteUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.creditNoteUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Nota de crédito guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedCreditNoteIdSource.next(0);
          this.selectedCreditNoteIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar nota de crédito',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteCreditNote(item: ICreditNote): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.creditNoteUrl}/${item.creditNoteId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Nota de crédito eliminada',
              toastType.success
            );
            this.setSelectedCreditNoteId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar nota de crédito',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getCreditNoteDocument(creditNoteId: number): Observable<ICreditNote> {
    return this.http
      .get<IApiResponse<ICreditNote>>(`${this.creditNoteUrl}/document/${creditNoteId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyCreditNote());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyCreditNote());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: ICreditNote | null | undefined): ICreditNote {
    if (!row) {
      return this.createEmptyCreditNote();
    }
    return {
      ...this.emptyCreditNote,
      ...row,
      creditNoteId: Number(row.creditNoteId) || 0,
      warehouseId: Number(row.warehouseId) || null,
      reference: row.reference ?? '',
      invoiceId: Number(row.invoiceId) || null,
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
