import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@environments/environment';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  merge,
  of,
} from 'rxjs';
import {
  catchError,
  concatMap,
  map,
  scan,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';
import { IProvider, IProviderMovement } from './provider';

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  private readonly providerUrl = environment.API_URL + 'providers';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyProvider: IProvider = {
    providerId: 0,
    alternCode: '',
    description: '',
    taxRegistrationID: '',
    taxRegistrationID2: '',
    providerAssignedCode: '',
    debitLimit: null,
    debitAvailable: null,
    deactivated: false,
    comment: '',
    organizationId: 0,
  };

  private readonly providerContextIdSource = new BehaviorSubject<number>(0);
  providerContextIdAction$ = this.providerContextIdSource.asObservable();

  private readonly providerModifiedSubject = new Subject<Action<IProvider>>();
  private readonly providerModifiedAction$ =
    this.providerModifiedSubject.asObservable();

  private readonly enabledProviderGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableProviderGridAction$ = this.enabledProviderGridSource.asObservable();

  private readonly enabledProviderFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableProviderFormAction$ = this.enabledProviderFormSource.asObservable();

  private readonly movementsRefreshSubject = new BehaviorSubject<number>(0);
  private readonly movementsHistoricSubject = new BehaviorSubject<boolean>(
    false
  );

  providers$!: Observable<IProvider[]>;
  providerSelected$!: Observable<IProvider>;
  providerWithCRUD$!: Observable<IProvider[]>;
  providerMovements$!: Observable<IProviderMovement[]>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  setProviderContext(providerId: number): void {
    this.providerContextIdSource.next(providerId ?? 0);
    this.setMovementsHistoricView(false);
  }

  enableProviderGrid(enabled: boolean): void {
    this.enabledProviderGridSource.next(enabled);
  }

  enableProviderForm(enabled: boolean): void {
    this.enabledProviderFormSource.next(enabled);
  }

  addProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'add' });
  }

  updateProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'update' });
  }

  deleteProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'delete' });
  }

  private initializeObservables(): void {
    this.providers$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IProvider[]);
        }
        return this.http
          .get<IApiResponse<IProvider[]>>(
            `${this.providerUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as IProvider[]).map((row) => ({
                ...row,
                providerId: Number(row.providerId) || 0,
                organizationId: Number(row.organizationId) || organizationId,
              }))
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

    this.providerSelected$ = combineLatest([
      this.providers$,
      this.providerContextIdAction$,
    ]).pipe(
      map(([providers, providerId]) => {
        if (!providerId || providerId <= 0) {
          const organizationId =
            this.applicationService.workingOrganization?.organizationId ?? 0;
          return { ...this.emptyProvider, organizationId };
        }
        return (
          providers.find((p) => p.providerId === providerId) ?? {
            ...this.emptyProvider,
            organizationId:
              this.applicationService.workingOrganization?.organizationId ?? 0,
          }
        );
      })
    );

    this.providerWithCRUD$ = merge(
      this.providers$,
      this.providerModifiedAction$.pipe(
        concatMap((operation) => this.saveProvider(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyProviders(acc, value),
        [] as IProvider[]
      )
    );

    this.providerMovements$ = combineLatest([
      this.providerContextIdAction$,
      this.applicationService.workingOrganization$,
      this.movementsRefreshSubject,
      this.movementsHistoricSubject,
    ]).pipe(
      switchMap(([providerId, workingOrg, , historic]) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (!providerId || providerId <= 0 || !organizationId) {
          return of([] as IProviderMovement[]);
        }
        return this.getProviderMovements(providerId, organizationId, historic);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next(this.movementsRefreshSubject.value + 1);
  }

  setMovementsHistoricView(historic: boolean): void {
    if (this.movementsHistoricSubject.value === !!historic) {
      return;
    }
    this.movementsHistoricSubject.next(!!historic);
  }

  addMovement(item: IProviderMovement): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.providerUrl}/movement`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento almacenado',
            toastType.success
          );
          this.refreshMovements();
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  deleteMovement(movementId: number, providerId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.providerUrl}/movement/${movementId}/${providerId}`,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento eliminado',
            toastType.success
          );
          this.refreshMovements();
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  setMovementHistoric(
    movementId: number,
    providerId: number,
    historic: number
  ): Observable<number> {
    const toHistoric = historic ? 1 : 0;
    return this.http
      .put<IApiResponse<number>>(
        `${this.providerUrl}/movement/historic`,
        { movementId, providerId, historic: toHistoric },
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            toHistoric
              ? 'Movimiento subido a histórico'
              : 'Movimiento bajado de histórico',
            toastType.success
          );
          this.refreshMovements();
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getProviderMovements(
    providerId: number,
    organizationId: number,
    historic: boolean
  ): Observable<IProviderMovement[]> {
    const path = historic
      ? `${this.providerUrl}/movements/historic/${providerId}/${organizationId}`
      : `${this.providerUrl}/movements/${providerId}/${organizationId}`;
    return this.http
      .get<IApiResponse<IProviderMovement[]>>(path)
      .pipe(
        map((data) =>
          ((data.result ?? []) as IProviderMovement[]).map((row) =>
            this.normalizeMovement(row)
          )
        ),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of([] as IProviderMovement[]);
          }
          return this.errorHandlerService.handleError(err);
        })
      );
  }

  private normalizeMovement(row: IProviderMovement): IProviderMovement {
    const anyRow = row as unknown as Record<string, unknown>;
    const raw = (key: string): unknown => anyRow[key];
    const text = (...keys: string[]): string | null => {
      for (const key of keys) {
        const value = raw(key);
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value);
        }
      }
      return null;
    };
    const num = (...keys: string[]): number | null => {
      for (const key of keys) {
        const value = Number(raw(key));
        if (!Number.isNaN(value) && raw(key) !== undefined && raw(key) !== null) {
          return value;
        }
      }
      return null;
    };

    const packed = text('reference', 'Reference') ?? '';
    const packedParts = packed.includes('\u001f')
      ? packed.split('\u001f')
      : null;

    return {
      ...row,
      reference: packedParts ? packedParts[0] || null : packed || null,
      treasuryId: num('treasuryId', 'TreasuryId') ?? row.treasuryId ?? null,
      treasuryName:
        text('treasuryName', 'TreasuryName') || packedParts?.[3] || null,
      treasuryType: text('treasuryType', 'TreasuryType'),
      beneficiary:
        text('beneficiary', 'Beneficiary') || packedParts?.[1] || null,
      cancellationDocumentType:
        text('cancellationDocumentType', 'CancellationDocumentType') ||
        packedParts?.[2] ||
        null,
      paymentReceipt:
        text('paymentReceipt', 'PaymentReceipt') ?? row.paymentReceipt,
      paymentDocument:
        text('paymentDocument', 'PaymentDocument') ?? row.paymentDocument,
      historic: num('historic', 'Historic') ?? row.historic ?? 0,
      creditDebit: num('creditDebit', 'CreditDebit') ?? row.creditDebit ?? 0,
    };
  }

  private modifyProviders(
    providers: IProvider[],
    operation: Action<IProvider>
  ): IProvider[] {
    if (operation.action === 'add') {
      return [...providers, operation.item];
    }
    if (operation.action === 'update') {
      return providers.map((provider) =>
        provider.providerId === operation.item.providerId
          ? operation.item
          : provider
      );
    }
    if (operation.action === 'delete') {
      return providers.filter(
        (provider) => provider.providerId !== operation.item.providerId
      );
    }
    return [...providers];
  }

  private saveProvider(
    operation: Action<IProvider>
  ): Observable<Action<IProvider>> {
    const provider: IProvider = {
      ...operation.item,
      providerId: Number(operation.item.providerId) || 0,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.providerUrl}/${provider.providerId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${provider.description}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: provider, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.providerUrl,
            { ...provider, providerId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.providerUrl, provider, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${provider.description}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...provider,
          providerId: Number(data.result) || provider.providerId,
        },
        action: operation.action,
      })),
      catchError(this.errorHandlerService.handleError)
    );
  }
}
