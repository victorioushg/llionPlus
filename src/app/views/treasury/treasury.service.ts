import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
  filter,
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
import {
  IBankMovementTotals,
  ICashMovementTotals,
  ITreasury,
  ITreasuryMovement,
  TREASURY_TYPE_BANK,
  TREASURY_TYPE_CASHBOX,
} from './treasury';

@Injectable({
  providedIn: 'root',
})
export class TreasuryService {
  private readonly treasuryUrl = environment.API_URL + 'treasuries';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyTreasury: ITreasury = {
    treasuryId: 0,
    alternCode: '',
    treasuryName: '',
    treasuryAccountNumber: '',
    treasuryType: null,
    actualBalance: null,
    accountId: null,
    classId: null,
    deactivated: false,
    currencyId: null,
    organizationId: 0,
  };

  private readonly treasuryTypeFilterSource = new BehaviorSubject<string | null>(
    null
  );
  treasuryTypeFilterAction$ = this.treasuryTypeFilterSource.asObservable();

  private readonly treasuryContextIdSource = new BehaviorSubject<number>(0);
  treasuryContextIdAction$ = this.treasuryContextIdSource.asObservable();

  private readonly treasuryModifiedSubject = new Subject<Action<ITreasury>>();
  private readonly treasuryModifiedAction$ =
    this.treasuryModifiedSubject.asObservable();

  private readonly enabledTreasuryGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableTreasuryGridAction$ = this.enabledTreasuryGridSource.asObservable();

  private readonly enabledTreasuryFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableTreasuryFormAction$ = this.enabledTreasuryFormSource.asObservable();

  private readonly movementsRefreshSubject = new Subject<void>();
  movementsChanged$ = this.movementsRefreshSubject.asObservable();
  private readonly movementsVisibleSubject = new Subject<void>();
  movementsVisible$ = this.movementsVisibleSubject.asObservable();

  treasuries$!: Observable<ITreasury[]>;
  treasurySelected$!: Observable<ITreasury>;
  treasuryWithCRUD$!: Observable<ITreasury[]>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  get currentTreasuryType(): string | null {
    return this.treasuryTypeFilterSource.value;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  setTreasuryTypeFilter(treasuryType: string | null): void {
    this.treasuryTypeFilterSource.next(treasuryType);
  }

  /** Banks + cashboxes for an organization — independent of page type filter. */
  getOrganizationTreasuries(organizationId: number): Observable<ITreasury[]> {
    if (!organizationId || organizationId <= 0) {
      return of([]);
    }
    return combineLatest([
      this.getOrganizationTreasuriesByType(organizationId, TREASURY_TYPE_BANK),
      this.getOrganizationTreasuriesByType(
        organizationId,
        TREASURY_TYPE_CASHBOX
      ),
    ]).pipe(map(([banks, cashboxes]) => [...banks, ...cashboxes]));
  }

  private getOrganizationTreasuriesByType(
    organizationId: number,
    type: string
  ): Observable<ITreasury[]> {
    const params = new HttpParams().set('treasuryType', type);
    return this.http
      .get<IApiResponse<ITreasury[]>>(
        `${this.treasuryUrl}/${organizationId}/0`,
        { params }
      )
      .pipe(
        map((data) =>
          ((data.result ?? []) as ITreasury[])
            .map((row) => this.normalizeTreasury(row, organizationId, type))
            .filter((row) => row.treasuryType === type)
        ),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  setTreasuryContext(treasuryId: number): void {
    this.treasuryContextIdSource.next(treasuryId ?? 0);
  }

  enableTreasuryGrid(enabled: boolean): void {
    this.enabledTreasuryGridSource.next(enabled);
  }

  enableTreasuryForm(enabled: boolean): void {
    this.enabledTreasuryFormSource.next(enabled);
  }

  addTreasury(treasury: ITreasury): void {
    this.treasuryModifiedSubject.next({ item: treasury, action: 'add' });
  }

  updateTreasury(treasury: ITreasury): void {
    this.treasuryModifiedSubject.next({ item: treasury, action: 'update' });
  }

  deleteTreasury(treasury: ITreasury): void {
    this.treasuryModifiedSubject.next({ item: treasury, action: 'delete' });
  }

  private initializeObservables(): void {
    this.treasuries$ = combineLatest([
      this.applicationService.workingOrganization$,
      this.treasuryTypeFilterAction$,
    ]).pipe(
      // Wait until both working org and page type (BAN/CAJ) are ready
      filter(
        ([workingOrg, treasuryType]) =>
          !!workingOrg?.organizationId &&
          workingOrg.organizationId > 0 &&
          !!treasuryType
      ),
      switchMap(([workingOrg, treasuryType]) => {
        const organizationId = workingOrg!.organizationId;
        const type = String(treasuryType).trim().toUpperCase();
        const params = new HttpParams().set('treasuryType', type);

        return this.http
          .get<IApiResponse<ITreasury[]>>(
            `${this.treasuryUrl}/${organizationId}/0`,
            { params }
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as ITreasury[])
                .map((row) => this.normalizeTreasury(row, organizationId, type))
                .filter((row) => row.treasuryType === type)
            ),
            catchError((err) => this.errorHandlerService.handleError(err))
          );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.treasurySelected$ = combineLatest([
      this.treasuries$,
      this.treasuryContextIdAction$,
      this.treasuryTypeFilterAction$,
    ]).pipe(
      map(([treasuries, treasuryId, treasuryType]) => {
        const organizationId =
          this.applicationService.workingOrganization?.organizationId ?? 0;
        if (!treasuryId || treasuryId <= 0) {
          return {
            ...this.emptyTreasury,
            organizationId,
            treasuryType,
          };
        }
        return (
          treasuries.find((t) => t.treasuryId === treasuryId) ?? {
            ...this.emptyTreasury,
            organizationId,
            treasuryType,
          }
        );
      })
    );

    this.treasuryWithCRUD$ = merge(
      this.treasuries$,
      this.treasuryModifiedAction$.pipe(
        concatMap((operation) => this.saveTreasury(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array
            ? [...value]
            : this.modifyTreasuries(acc, value),
        [] as ITreasury[]
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next();
  }

  notifyMovementsVisible(): void {
    this.movementsVisibleSubject.next();
  }

  addMovement(item: ITreasuryMovement): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.treasuryUrl}/movement`, item, {
        headers: this.headers,
        params: this.treasuryTypeParams(),
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

  updateMovement(item: ITreasuryMovement): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.treasuryUrl}/movement`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento actualizado',
            toastType.success
          );
          this.refreshMovements();
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  deleteMovement(movementId: number, treasuryId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.treasuryUrl}/movement/${movementId}/${treasuryId}`,
        { headers: this.headers, params: this.treasuryTypeParams() }
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

  getTreasuryMovementPage(
    treasuryId: number,
    organizationId: number,
    take: number,
    beforeDate: string | null,
    beforeId: number | null,
    search: string
  ): Observable<ITreasuryMovement[]> {
    let params = new HttpParams().set('take', String(take));
    if (beforeDate) {
      params = params.set('beforeDate', beforeDate);
    }
    if (beforeId) {
      params = params.set('beforeId', String(beforeId));
    }
    const needle = (search || '').trim();
    if (needle) {
      params = params.set('search', needle);
    }
    const treasuryType = this.currentTreasuryType;
    if (treasuryType) {
      params = params.set('treasuryType', treasuryType);
    }

    return this.http
      .get<IApiResponse<ITreasuryMovement[]>>(
        `${this.treasuryUrl}/movements/${treasuryId}/${organizationId}`,
        { params }
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  getCashMovementTotals(
    treasuryId: number,
    organizationId: number
  ): Observable<ICashMovementTotals> {
    const empty: ICashMovementTotals = {
      cashAmount: 0,
      checkAmount: 0,
      cardAmount: 0,
      voucherAmount: 0,
      totalAmount: 0,
    };
    if (treasuryId <= 0 || organizationId <= 0) {
      return of(empty);
    }
    return this.http
      .get<IApiResponse<ICashMovementTotals>>(
        `${this.treasuryUrl}/movements/totals/${treasuryId}/${organizationId}`
      )
      .pipe(
        map((data) => ({
          cashAmount: Number(data.result?.cashAmount) || 0,
          checkAmount: Number(data.result?.checkAmount) || 0,
          cardAmount: Number(data.result?.cardAmount) || 0,
          voucherAmount: Number(data.result?.voucherAmount) || 0,
          totalAmount: Number(data.result?.totalAmount) || 0,
        })),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(empty);
        })
      );
  }

  getBankMovementTotals(
    treasuryId: number,
    organizationId: number
  ): Observable<IBankMovementTotals> {
    const empty: IBankMovementTotals = {
      depositAmount: 0,
      creditNoteAmount: 0,
      debitNoteAmount: 0,
      checkAmount: 0,
      totalAmount: 0,
    };
    if (treasuryId <= 0 || organizationId <= 0) {
      return of(empty);
    }
    return this.http
      .get<IApiResponse<IBankMovementTotals>>(
        `${this.treasuryUrl}/movements/bank-totals/${treasuryId}/${organizationId}`
      )
      .pipe(
        map((data) => ({
          depositAmount: Number(data.result?.depositAmount) || 0,
          creditNoteAmount: Number(data.result?.creditNoteAmount) || 0,
          debitNoteAmount: Number(data.result?.debitNoteAmount) || 0,
          checkAmount: Number(data.result?.checkAmount) || 0,
          totalAmount: Number(data.result?.totalAmount) || 0,
        })),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(empty);
        })
      );
  }

  private normalizeTreasury(
    row: ITreasury,
    organizationId: number,
    fallbackType: string
  ): ITreasury {
    return {
      ...row,
      treasuryId: Number(row.treasuryId) || 0,
      organizationId: Number(row.organizationId) || organizationId,
      deactivated: !!row.deactivated,
      treasuryType: this.normalizeTreasuryType(row, fallbackType),
    };
  }

  private normalizeTreasuryType(
    row: ITreasury,
    fallbackType: string
  ): string | null {
    const raw = String(row.treasuryType ?? '')
      .trim()
      .toUpperCase();

    if (raw === TREASURY_TYPE_BANK || raw === TREASURY_TYPE_CASHBOX) {
      return raw;
    }
    if (raw === '0') {
      return TREASURY_TYPE_BANK;
    }
    if (raw === '1') {
      return TREASURY_TYPE_CASHBOX;
    }

    const name = String(row.treasuryName ?? '').toUpperCase();
    if (name.includes('CAJA')) {
      return TREASURY_TYPE_CASHBOX;
    }
    if (name.includes('BANCO') || name.startsWith('BAN')) {
      return TREASURY_TYPE_BANK;
    }

    // Server already filtered by type; keep rows even if type mapping failed
    return fallbackType || null;
  }

  private treasuryTypeParams(): HttpParams {
    const treasuryType = this.currentTreasuryType;
    return treasuryType
      ? new HttpParams().set('treasuryType', treasuryType)
      : new HttpParams();
  }

  private modifyTreasuries(
    treasuries: ITreasury[],
    operation: Action<ITreasury>
  ): ITreasury[] {
    if (operation.action === 'add') {
      return [...treasuries, operation.item];
    }
    if (operation.action === 'update') {
      return treasuries.map((treasury) =>
        treasury.treasuryId === operation.item.treasuryId
          ? operation.item
          : treasury
      );
    }
    if (operation.action === 'delete') {
      return treasuries.filter(
        (treasury) => treasury.treasuryId !== operation.item.treasuryId
      );
    }
    return [...treasuries];
  }

  private saveTreasury(
    operation: Action<ITreasury>
  ): Observable<Action<ITreasury>> {
    const treasury: ITreasury = {
      ...operation.item,
      treasuryId: Number(operation.item.treasuryId) || 0,
      treasuryType: operation.item.treasuryType || this.currentTreasuryType,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.treasuryUrl}/${treasury.treasuryId}`,
          { headers: this.headers, params: this.treasuryTypeParams() }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${treasury.treasuryName}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: treasury, action: operation.action })),
          catchError((err) => this.errorHandlerService.handleError(err))
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.treasuryUrl,
            { ...treasury, treasuryId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.treasuryUrl, treasury, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${treasury.treasuryName}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...treasury,
          treasuryId: Number(data.result) || treasury.treasuryId,
        },
        action: operation.action,
      })),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }
}
