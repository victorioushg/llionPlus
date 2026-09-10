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
import { IDebitNote } from './debit-note';

@Injectable({
  providedIn: 'root',
})
export class DebitNoteService {
  private readonly debitNoteUrl = environment.API_URL + 'salesdebitnotes';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedDebitNoteIdSource = new BehaviorSubject<number>(0);
  private readonly draftDebitNoteSource = new BehaviorSubject<IDebitNote | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyDebitNote: IDebitNote = {
    debitNoteId: 0,
    debitNoteNumber: '',
    debitNoteSeriesCode: '',
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

  debitNotes$!: Observable<IDebitNote[]>;
  selectedDebitNoteId$ = this.selectedDebitNoteIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  debitNoteSelected$!: Observable<IDebitNote>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.debitNotes$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IDebitNote[]);
            }
            return this.http
              .get<IApiResponse<IDebitNote[]>>(
                `${this.debitNoteUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IDebitNote[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.debitNoteSelected$ = combineLatest([
      this.selectedDebitNoteIdSource,
      this.draftDebitNoteSource,
    ]).pipe(
      switchMap(([debitNoteId, draft]) => {
        if (debitNoteId <= 0) {
          return of(draft ?? this.createEmptyDebitNote());
        }
        return this.getDebitNoteDocument(debitNoteId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftDebitNoteSource.next(null);
        this.setSelectedDebitNoteId(0);
        this.enableForm(false);
      });
  }

  setSelectedDebitNoteId(debitNoteId: number): void {
    if ((debitNoteId ?? 0) > 0) {
      this.draftDebitNoteSource.next(null);
    }
    this.selectedDebitNoteIdSource.next(debitNoteId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const debitNoteId = this.selectedDebitNoteIdSource.value;
    this.enableForm(false);
    if (debitNoteId <= 0) {
      this.draftDebitNoteSource.next(null);
      return;
    }
    this.selectedDebitNoteIdSource.next(0);
    this.selectedDebitNoteIdSource.next(debitNoteId);
  }

  beginNewDebitNote(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextDebitNoteNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de nota de débito',
            toastType.warning
          );
          return;
        }
        this.draftDebitNoteSource.next({
          ...this.createEmptyDebitNote(),
          debitNoteNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedDebitNoteId(0);
        this.enableForm(true);
      });
  }

  getNextDebitNoteNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.debitNoteUrl}/next/${organizationId}`
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

  createEmptyDebitNote(): IDebitNote {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyDebitNote,
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

  saveDebitNote(quote: IDebitNote): Observable<number> {
    const request$ =
      (quote.debitNoteId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.debitNoteUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.debitNoteUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Nota de débito guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedDebitNoteIdSource.next(0);
          this.selectedDebitNoteIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar nota de débito',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteDebitNote(item: IDebitNote): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.debitNoteUrl}/${item.debitNoteId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Nota de débito eliminada',
              toastType.success
            );
            this.setSelectedDebitNoteId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar nota de débito',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getDebitNoteDocument(debitNoteId: number): Observable<IDebitNote> {
    return this.http
      .get<IApiResponse<IDebitNote>>(`${this.debitNoteUrl}/document/${debitNoteId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyDebitNote());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyDebitNote());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: IDebitNote | null | undefined): IDebitNote {
    if (!row) {
      return this.createEmptyDebitNote();
    }
    return {
      ...this.emptyDebitNote,
      ...row,
      debitNoteId: Number(row.debitNoteId) || 0,
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
