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
import { ICustomer, ICustomerMovement } from './customer';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly customerUrl = environment.API_URL + 'customers';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyCustomer: ICustomer = {
    customerId: 0,
    alternCode: '',
    description: '',
    taxRegistrationID: '',
    taxRegistrationID2: '',
    creditLimit: null,
    creditAvailable: null,
    deactivated: false,
    comment: '',
    organizationId: 0,
  };

  private readonly customerContextIdSource = new BehaviorSubject<number>(0);
  customerContextIdAction$ = this.customerContextIdSource.asObservable();

  private readonly customerModifiedSubject = new Subject<Action<ICustomer>>();
  private readonly customerModifiedAction$ =
    this.customerModifiedSubject.asObservable();

  private readonly enabledCustomerGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableCustomerGridAction$ = this.enabledCustomerGridSource.asObservable();

  private readonly enabledCustomerFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableCustomerFormAction$ = this.enabledCustomerFormSource.asObservable();

  private readonly movementsRefreshSubject = new BehaviorSubject<number>(0);

  customers$!: Observable<ICustomer[]>;
  customerSelected$!: Observable<ICustomer>;
  customerWithCRUD$!: Observable<ICustomer[]>;
  customerMovements$!: Observable<ICustomerMovement[]>;

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

  setCustomerContext(customerId: number): void {
    this.customerContextIdSource.next(customerId ?? 0);
  }

  enableCustomerGrid(enabled: boolean): void {
    this.enabledCustomerGridSource.next(enabled);
  }

  enableCustomerForm(enabled: boolean): void {
    this.enabledCustomerFormSource.next(enabled);
  }

  addCustomer(customer: ICustomer): void {
    this.customerModifiedSubject.next({ item: customer, action: 'add' });
  }

  updateCustomer(customer: ICustomer): void {
    this.customerModifiedSubject.next({ item: customer, action: 'update' });
  }

  deleteCustomer(customer: ICustomer): void {
    this.customerModifiedSubject.next({ item: customer, action: 'delete' });
  }

  private initializeObservables(): void {
    this.customers$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as ICustomer[]);
        }
        return this.http
          .get<IApiResponse<ICustomer[]>>(
            `${this.customerUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as ICustomer[]).map((row) => ({
                ...row,
                customerId: Number(row.customerId) || 0,
                organizationId: Number(row.organizationId) || organizationId,
              }))
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

    this.customerSelected$ = combineLatest([
      this.customers$,
      this.customerContextIdAction$,
    ]).pipe(
      map(([customers, customerId]) => {
        if (!customerId || customerId <= 0) {
          const organizationId =
            this.applicationService.workingOrganization?.organizationId ?? 0;
          return { ...this.emptyCustomer, organizationId };
        }
        return (
          customers.find((c) => c.customerId === customerId) ?? {
            ...this.emptyCustomer,
            organizationId:
              this.applicationService.workingOrganization?.organizationId ?? 0,
          }
        );
      })
    );

    this.customerWithCRUD$ = merge(
      this.customers$,
      this.customerModifiedAction$.pipe(
        concatMap((operation) => this.saveCustomer(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyCustomers(acc, value),
        [] as ICustomer[]
      )
    );

    this.customerMovements$ = combineLatest([
      this.customerContextIdAction$,
      this.applicationService.workingOrganization$,
      this.movementsRefreshSubject,
    ]).pipe(
      switchMap(([customerId, workingOrg]) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (!customerId || customerId <= 0 || !organizationId) {
          return of([] as ICustomerMovement[]);
        }
        return this.getCustomerMovements(customerId, organizationId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next(this.movementsRefreshSubject.value + 1);
  }

  private getCustomerMovements(
    customerId: number,
    organizationId: number
  ): Observable<ICustomerMovement[]> {
    return this.http
      .get<IApiResponse<ICustomerMovement[]>>(
        `${this.customerUrl}/movements/${customerId}/${organizationId}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of([] as ICustomerMovement[]);
          }
          return this.errorHandlerService.handleError(err);
        })
      );
  }

  private modifyCustomers(
    customers: ICustomer[],
    operation: Action<ICustomer>
  ): ICustomer[] {
    if (operation.action === 'add') {
      return [...customers, operation.item];
    }
    if (operation.action === 'update') {
      return customers.map((customer) =>
        customer.customerId === operation.item.customerId
          ? operation.item
          : customer
      );
    }
    if (operation.action === 'delete') {
      return customers.filter(
        (customer) => customer.customerId !== operation.item.customerId
      );
    }
    return [...customers];
  }

  private saveCustomer(
    operation: Action<ICustomer>
  ): Observable<Action<ICustomer>> {
    const customer: ICustomer = {
      ...operation.item,
      customerId: Number(operation.item.customerId) || 0,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.customerUrl}/${customer.customerId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${customer.description}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: customer, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.customerUrl,
            { ...customer, customerId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.customerUrl, customer, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${customer.description}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...customer,
          customerId: Number(data.result) || customer.customerId,
        },
        action: operation.action,
      })),
      catchError(this.errorHandlerService.handleError)
    );
  }
}
