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
import { IQuote } from './quote';

@Injectable({
  providedIn: 'root',
})
export class QuoteService {
  private readonly quoteUrl = environment.API_URL + 'quotes';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedQuoteIdSource = new BehaviorSubject<number>(0);
  private readonly draftQuoteSource = new BehaviorSubject<IQuote | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyQuote: IQuote = {
    quoteId: 0,
    quoteNumber: '',
    quoteSeriesCode: '',
    customerId: null,
    customerCode: '',
    customerName: '',
    billingPrice: '',
    issueDate: null,
    dueDate: null,
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

  quotes$!: Observable<IQuote[]>;
  selectedQuoteId$ = this.selectedQuoteIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  quoteSelected$!: Observable<IQuote>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.quotes$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IQuote[]);
            }
            return this.http
              .get<IApiResponse<IQuote[]>>(
                `${this.quoteUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IQuote[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.quoteSelected$ = combineLatest([
      this.selectedQuoteIdSource,
      this.draftQuoteSource,
    ]).pipe(
      switchMap(([quoteId, draft]) => {
        if (quoteId <= 0) {
          return of(draft ?? this.createEmptyQuote());
        }
        return this.getQuoteDocument(quoteId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftQuoteSource.next(null);
        this.setSelectedQuoteId(0);
        this.enableForm(false);
      });
  }

  setSelectedQuoteId(quoteId: number): void {
    if ((quoteId ?? 0) > 0) {
      this.draftQuoteSource.next(null);
    }
    this.selectedQuoteIdSource.next(quoteId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const quoteId = this.selectedQuoteIdSource.value;
    this.enableForm(false);
    if (quoteId <= 0) {
      this.draftQuoteSource.next(null);
      return;
    }
    this.selectedQuoteIdSource.next(0);
    this.selectedQuoteIdSource.next(quoteId);
  }

  beginNewQuote(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextQuoteNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de presupuesto',
            toastType.warning
          );
          return;
        }
        this.draftQuoteSource.next({
          ...this.createEmptyQuote(),
          quoteNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedQuoteId(0);
        this.enableForm(true);
      });
  }

  getNextQuoteNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.quoteUrl}/next/${organizationId}`
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

  createEmptyQuote(): IQuote {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyQuote,
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

  saveQuote(quote: IQuote): Observable<number> {
    const request$ =
      (quote.quoteId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.quoteUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.quoteUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Presupuesto guardado',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedQuoteIdSource.next(0);
          this.selectedQuoteIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar el presupuesto',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteQuote(item: IQuote): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.quoteUrl}/${item.quoteId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Presupuesto eliminado',
              toastType.success
            );
            this.setSelectedQuoteId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar el presupuesto',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getQuoteDocument(quoteId: number): Observable<IQuote> {
    return this.http
      .get<IApiResponse<IQuote>>(`${this.quoteUrl}/document/${quoteId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyQuote());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyQuote());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: IQuote | null | undefined): IQuote {
    if (!row) {
      return this.createEmptyQuote();
    }
    return {
      ...this.emptyQuote,
      ...row,
      quoteId: Number(row.quoteId) || 0,
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
