import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
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
import { IAccountClass } from '@views/accounting/classes/class';
import { ClassesService } from '@views/accounting/classes/classes.service';
import { IAccount, IAccountMonthlyBalance, IAccountMovement } from './account';

/** Raw API row — supports both C# names and legacy Angular aliases. */
type AccountApiRow = IAccount & {
  accountNumber?: string | null;
  bankNumber?: string | null;
  parentFullName?: string | null;
  description?: string | null;
  currencyListId?: string | null;
  level?: number | null;
  Desc?: string | null;
  ParentId_FullName?: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class AccountsService {
  private readonly accountUrl = environment.API_URL + 'accounts';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyAccount: IAccount = {
    accountId: 0,
    code: '',
    name: '',
    fullName: '',
    desc: '',
    description: '',
    parentId: null,
    parentId_FullName: '',
    parentFullName: '',
    subLevel: 0,
    mark: false,
    accountType: null,
    specialAccountType: null,
    cashFlowClassification: null,
    openBalance: null,
    openBalanceDate: null,
    balance: null,
    totalBalance: null,
    isActive: true,
    isTaxAccount: false,
    treasureId: null,
    taxLineId: null,
    taxLineName: '',
    salesTaxCodeId: null,
    salesTaxCodeFullName: '',
    currencyId: null,
    currencyFullName: '',
    organizationId: 0,
  };

  private readonly accountContextIdSource = new BehaviorSubject<number>(0);
  accountContextIdAction$ = this.accountContextIdSource.asObservable();

  private readonly accountModifiedSubject = new Subject<Action<IAccount>>();
  private readonly accountModifiedAction$ =
    this.accountModifiedSubject.asObservable();

  private readonly enabledAccountGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableAccountGridAction$ = this.enabledAccountGridSource.asObservable();

  private readonly enabledAccountFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableAccountFormAction$ = this.enabledAccountFormSource.asObservable();

  private readonly movementsRefreshSubject = new BehaviorSubject<number>(0);

  accounts$!: Observable<IAccount[]>;
  classes$!: Observable<IAccountClass[]>;
  accountSelected$!: Observable<IAccount>;
  accountWithCRUD$!: Observable<IAccount[]>;
  accountMovements$!: Observable<IAccountMovement[]>;
  accountMonthlyBalances$!: Observable<IAccountMonthlyBalance[]>;

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private classesService: ClassesService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  setAccountContext(accountId: number): void {
    this.accountContextIdSource.next(accountId ?? 0);
  }

  enableAccountGrid(enabled: boolean): void {
    this.enabledAccountGridSource.next(enabled);
  }

  enableAccountForm(enabled: boolean): void {
    this.enabledAccountFormSource.next(enabled);
  }

  addAccount(account: IAccount): void {
    this.accountModifiedSubject.next({ item: account, action: 'add' });
  }

  updateAccount(account: IAccount): void {
    this.accountModifiedSubject.next({ item: account, action: 'update' });
  }

  deleteAccount(account: IAccount): void {
    this.accountModifiedSubject.next({ item: account, action: 'delete' });
  }

  /** Normalize API ↔ UI fields (Desc, ParentId_FullName, aliases). */
  normalizeAccount(row: AccountApiRow, organizationId: number): IAccount {
    const code = row.code ?? row.accountNumber ?? '';
    const name = row.name ?? '';
    const desc =
      row.desc ?? row.Desc ?? row.description ?? '';
    const parentFullName =
      row.parentId_FullName ??
      row.ParentId_FullName ??
      row.parentFullName ??
      '';

    return {
      ...row,
      accountId: Number(row.accountId) || 0,
      code,
      name,
      fullName: row.fullName ?? name,
      desc,
      description: desc || name,
      parentId: row.parentId ?? null,
      parentId_FullName: parentFullName,
      parentFullName,
      subLevel: row.subLevel ?? row.level ?? 0,
      mark: !!row.mark,
      accountType: row.accountType ?? null,
      specialAccountType: row.specialAccountType ?? null,
      cashFlowClassification: row.cashFlowClassification ?? null,
      openBalance: row.openBalance ?? null,
      openBalanceDate: row.openBalanceDate ?? null,
      balance: row.balance ?? null,
      totalBalance: row.totalBalance ?? null,
      isActive: row.isActive ?? true,
      isTaxAccount: !!row.isTaxAccount,
      treasureId: row.treasureId ?? null,
      taxLineId: row.taxLineId ?? null,
      taxLineName: row.taxLineName ?? '',
      salesTaxCodeId: row.salesTaxCodeId ?? null,
      salesTaxCodeFullName: row.salesTaxCodeFullName ?? '',
      currencyId: row.currencyId ?? null,
      currencyFullName: row.currencyFullName ?? '',
      organizationId: Number(row.organizationId) || organizationId,
    };
  }

  /** Payload shaped for C# Account binding. */
  toApiPayload(account: IAccount): Record<string, unknown> {
    const parentFullName =
      account.parentId_FullName ?? account.parentFullName ?? '';
    const desc = account.desc ?? account.description ?? '';
    const name = account.name ?? '';
    const code = account.code ?? '';

    return {
      accountId: Number(account.accountId) || 0,
      code,
      name,
      fullName: account.fullName || name,
      isActive: account.isActive ?? true,
      parentId: account.parentId ?? null,
      parentId_FullName: parentFullName,
      ParentId_FullName: parentFullName,
      subLevel: account.subLevel ?? 0,
      mark: account.mark ?? false,
      accountType: account.accountType ?? null,
      specialAccountType: account.specialAccountType ?? null,
      isTaxAccount: account.isTaxAccount ?? false,
      treasureId: account.treasureId ?? null,
      desc,
      Desc: desc,
      balance: account.balance ?? null,
      totalBalance: account.totalBalance ?? null,
      openBalance: account.openBalance ?? null,
      openBalanceDate: account.openBalanceDate ?? null,
      cashFlowClassification: account.cashFlowClassification ?? null,
      salesTaxCodeId: account.salesTaxCodeId ?? null,
      salesTaxCodeFullName: account.salesTaxCodeFullName ?? '',
      taxLineId: account.taxLineId ?? null,
      taxLineName: account.taxLineName ?? '',
      currencyFullName: account.currencyFullName ?? '',
      currencyId: account.currencyId ?? null,
      organizationId: account.organizationId,
    };
  }

  private initializeObservables(): void {
    this.accounts$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IAccount[]);
        }
        return this.http
          .get<IApiResponse<AccountApiRow[]>>(
            `${this.accountUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as AccountApiRow[]).map((row) =>
                this.normalizeAccount(row, organizationId)
              )
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

    this.classes$ = this.classesService.classes$;

    this.accountSelected$ = combineLatest([
      this.accounts$,
      this.accountContextIdAction$,
    ]).pipe(
      map(([accounts, accountId]) => {
        if (!accountId || accountId <= 0) {
          const organizationId =
            this.applicationService.workingOrganization?.organizationId ?? 0;
          return { ...this.emptyAccount, organizationId };
        }
        return (
          accounts.find((a) => a.accountId === accountId) ?? {
            ...this.emptyAccount,
            organizationId:
              this.applicationService.workingOrganization?.organizationId ?? 0,
          }
        );
      })
    );

    this.accountWithCRUD$ = merge(
      this.accounts$,
      this.accountModifiedAction$.pipe(
        concatMap((operation) => this.saveAccount(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyAccounts(acc, value),
        [] as IAccount[]
      )
    );

    this.accountMovements$ = combineLatest([
      this.accountContextIdAction$,
      this.applicationService.workingOrganization$,
      this.movementsRefreshSubject,
    ]).pipe(
      switchMap(([accountId, workingOrg]) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (!accountId || accountId <= 0 || organizationId <= 0) {
          return of([] as IAccountMovement[]);
        }
        return this.getAccountMovements(accountId, organizationId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.accountMonthlyBalances$ = combineLatest([
      this.accountContextIdAction$,
      this.applicationService.workingOrganization$,
    ]).pipe(
      switchMap(([accountId, workingOrg]) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (!accountId || accountId <= 0 || organizationId <= 0) {
          return of([] as IAccountMonthlyBalance[]);
        }
        return this.getAccountMonthlyBalances(accountId, organizationId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next(this.movementsRefreshSubject.value + 1);
  }

  private getAccountMonthlyBalances(
    accountId: number,
    organizationId: number
  ): Observable<IAccountMonthlyBalance[]> {
    return this.http
      .get<IApiResponse<Array<IAccountMonthlyBalance & Record<string, unknown>>>>(
        `${this.accountUrl}/monthly-balances/${accountId}/${organizationId}`
      )
      .pipe(
        map((data) =>
          (
            (data.result ?? []) as Array<
              IAccountMonthlyBalance & Record<string, unknown>
            >
          ).map((row) => this.normalizeMonthlyBalance(row))
        ),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of([] as IAccountMonthlyBalance[]);
          }
          return this.errorHandlerService.handleError(err);
        })
      );
  }

  private normalizeMonthlyBalance(
    row: IAccountMonthlyBalance & Record<string, unknown>
  ): IAccountMonthlyBalance {
    return {
      monthNumber: Number(row.monthNumber ?? row['MonthNumber']) || 0,
      monthName: String(row.monthName ?? row['MonthName'] ?? '').trim(),
      fiscalYear: Number(row.fiscalYear ?? row['FiscalYear']) || 0,
      debits: Number(row.debits ?? row['Debits']) || 0,
      credits: Number(row.credits ?? row['Credits']) || 0,
      balance: Number(row.balance ?? row['Balance']) || 0,
    };
  }

  private getAccountMovements(
    accountId: number,
    organizationId: number,
    dateFrom?: string | null,
    dateTo?: string | null,
    fiscalPeriod?: number | null
  ): Observable<IAccountMovement[]> {
    let params = new HttpParams();
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    if (fiscalPeriod) {
      params = params.set('fiscalPeriod', String(fiscalPeriod));
    }
    return this.http
      .get<IApiResponse<Array<IAccountMovement & Record<string, unknown>>>>(
        `${this.accountUrl}/movements/${accountId}/${organizationId}`,
        { params }
      )
      .pipe(
        map((data) =>
          ((data.result ?? []) as Array<IAccountMovement & Record<string, unknown>>).map(
            (row) => this.normalizeMovement(row)
          )
        ),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of([] as IAccountMovement[]);
          }
          return this.errorHandlerService.handleError(err);
        })
      );
  }

  normalizeMovement(
    row: IAccountMovement & Record<string, unknown>
  ): IAccountMovement {
    const movementType = this.asOptionalBoolean(
      row.movementType ?? row['MovementType']
    );
    const journalEntryId =
      Number(row.journalEntryId ?? row['JournalEntryId']) || 0;
    const rowNumber = Number(row.rowNumber ?? row['RowNumber']) || 0;
    const movementId = Number(row.movementId ?? row['MovementId']) || 0;
    return {
      movementId,
      movementKey: journalEntryId
        ? `${journalEntryId}-${rowNumber}`
        : String(movementId),
      journalEntryId: journalEntryId || null,
      rowNumber: rowNumber || null,
      accountId: Number(row.accountId ?? row['AccountId']) || null,
      accountCode: String(
        row.accountCode ?? row['AccountCode'] ?? row['Code'] ?? ''
      ).trim(),
      classId: Number(row.classId ?? row['ClassId']) || null,
      movementDate: this.asDate(
        row.movementDate ?? row['MovementDate'] ?? row['JournalEntryDate']
      ),
      journalDescription: String(
        row.journalDescription ??
          row['journal_Description'] ??
          row['Journal_Description'] ??
          row['JournalDescription'] ??
          row['JournalEntryCode'] ??
          ''
      ).trim(),
      reference: String(
        row.reference ?? row['Reference'] ?? row['ReferenceNumber'] ?? ''
      ).trim(),
      movementDescription: String(
        row.movementDescription ??
          row['MovementDescription'] ??
          row['Memo'] ??
          ''
      ).trim(),
      movementType,
      movementTypeLabel:
        movementType === true ? 'Debe' : movementType === false ? 'Haber' : '',
      amount: row.amount ?? (row['Amount'] as number | null) ?? null,
      fiscalPeriod:
        Number(row.fiscalPeriod ?? row['FiscalPeriod']) || null,
      organizationId:
        Number(row.organizationId ?? row['OrganizationId']) || null,
    };
  }

  private asDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const text = String(value ?? '').trim();
    if (!text) {
      return null;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private asOptionalBoolean(value: unknown): boolean | null {
    if (value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 0 || value === '0') {
      return false;
    }
    return null;
  }

  private modifyAccounts(
    accounts: IAccount[],
    operation: Action<IAccount>
  ): IAccount[] {
    if (operation.action === 'add') {
      return [...accounts, operation.item];
    }
    if (operation.action === 'update') {
      return accounts.map((account) =>
        account.accountId === operation.item.accountId
          ? operation.item
          : account
      );
    }
    if (operation.action === 'delete') {
      return accounts.filter(
        (account) => account.accountId !== operation.item.accountId
      );
    }
    return [...accounts];
  }

  private saveAccount(
    operation: Action<IAccount>
  ): Observable<Action<IAccount>> {
    const account = this.normalizeAccount(
      operation.item,
      operation.item.organizationId
    );
    const accountName = account.name || account.desc || account.code;
    const payload = this.toApiPayload(account);

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.accountUrl}/${account.accountId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${accountName}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: account, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.accountUrl,
            { ...payload, accountId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.accountUrl, payload, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${accountName}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...account,
          accountId: Number(data.result) || account.accountId,
        },
        action: operation.action,
      })),
      catchError(this.errorHandlerService.handleError)
    );
  }
}
