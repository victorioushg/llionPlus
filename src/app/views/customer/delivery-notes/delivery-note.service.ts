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
import { IDeliveryNote } from './delivery-note';

@Injectable({
  providedIn: 'root',
})
export class DeliveryNoteService {
  private readonly deliveryNoteUrl = environment.API_URL + 'deliverynotes';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedDeliveryNoteIdSource = new BehaviorSubject<number>(0);
  private readonly draftDeliveryNoteSource = new BehaviorSubject<IDeliveryNote | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyDeliveryNote: IDeliveryNote = {
    deliveryNoteId: 0,
    deliveryNoteNumber: '',
    deliveryNoteSeriesCode: '',
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

  deliveryNotes$!: Observable<IDeliveryNote[]>;
  selectedDeliveryNoteId$ = this.selectedDeliveryNoteIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  deliveryNoteSelected$!: Observable<IDeliveryNote>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.deliveryNotes$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IDeliveryNote[]);
            }
            return this.http
              .get<IApiResponse<IDeliveryNote[]>>(
                `${this.deliveryNoteUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IDeliveryNote[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.deliveryNoteSelected$ = combineLatest([
      this.selectedDeliveryNoteIdSource,
      this.draftDeliveryNoteSource,
    ]).pipe(
      switchMap(([deliveryNoteId, draft]) => {
        if (deliveryNoteId <= 0) {
          return of(draft ?? this.createEmptyDeliveryNote());
        }
        return this.getDeliveryNoteDocument(deliveryNoteId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftDeliveryNoteSource.next(null);
        this.setSelectedDeliveryNoteId(0);
        this.enableForm(false);
      });
  }

  setSelectedDeliveryNoteId(deliveryNoteId: number): void {
    if ((deliveryNoteId ?? 0) > 0) {
      this.draftDeliveryNoteSource.next(null);
    }
    this.selectedDeliveryNoteIdSource.next(deliveryNoteId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const deliveryNoteId = this.selectedDeliveryNoteIdSource.value;
    this.enableForm(false);
    if (deliveryNoteId <= 0) {
      this.draftDeliveryNoteSource.next(null);
      return;
    }
    this.selectedDeliveryNoteIdSource.next(0);
    this.selectedDeliveryNoteIdSource.next(deliveryNoteId);
  }

  beginNewDeliveryNote(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextDeliveryNoteNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de nota de entrega',
            toastType.warning
          );
          return;
        }
        this.draftDeliveryNoteSource.next({
          ...this.createEmptyDeliveryNote(),
          deliveryNoteNumber: code,
          statusName: 'Pendiente',
          status: 0,
        });
        this.setSelectedDeliveryNoteId(0);
        this.enableForm(true);
      });
  }

  getNextDeliveryNoteNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.deliveryNoteUrl}/next/${organizationId}`
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

  createEmptyDeliveryNote(): IDeliveryNote {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyDeliveryNote,
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

  saveDeliveryNote(quote: IDeliveryNote): Observable<number> {
    const request$ =
      (quote.deliveryNoteId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.deliveryNoteUrl, quote, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.deliveryNoteUrl, quote, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Nota de entrega guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedDeliveryNoteIdSource.next(0);
          this.selectedDeliveryNoteIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar nota de entrega',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteDeliveryNote(item: IDeliveryNote): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.deliveryNoteUrl}/${item.deliveryNoteId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Nota de entrega eliminada',
              toastType.success
            );
            this.setSelectedDeliveryNoteId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar nota de entrega',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getDeliveryNoteDocument(deliveryNoteId: number): Observable<IDeliveryNote> {
    return this.http
      .get<IApiResponse<IDeliveryNote>>(`${this.deliveryNoteUrl}/document/${deliveryNoteId}`)
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyDeliveryNote());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyDeliveryNote());
        })
      );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private normalizeDocument(row: IDeliveryNote | null | undefined): IDeliveryNote {
    if (!row) {
      return this.createEmptyDeliveryNote();
    }
    return {
      ...this.emptyDeliveryNote,
      ...row,
      deliveryNoteId: Number(row.deliveryNoteId) || 0,
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
