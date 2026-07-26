import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  switchMap,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';
import { IAccount } from './account';

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
    description: '',
    level: null,
    mark: false,
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

  accounts$!: Observable<IAccount[]>;
  accountSelected$!: Observable<IAccount>;
  accountWithCRUD$!: Observable<IAccount[]>;

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
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

  private initializeObservables(): void {
    this.accounts$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IAccount[]);
        }
        return this.http
          .get<IApiResponse<IAccount[]>>(
            `${this.accountUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as IAccount[]).map((row) => ({
                ...row,
                accountId: Number(row.accountId) || 0,
                organizationId: Number(row.organizationId) || organizationId,
                mark: !!row.mark,
              }))
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

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
    const account: IAccount = {
      ...operation.item,
      accountId: Number(operation.item.accountId) || 0,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.accountUrl}/${account.accountId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${account.description}, datos eliminados`,
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
            { ...account, accountId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.accountUrl, account, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${account.description}, datos almacenados`,
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
