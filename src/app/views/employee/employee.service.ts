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
import { IEmployee } from './employee';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly employeeUrl = environment.API_URL + 'employees';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyEmployee: IEmployee = {
    employeeId: 0,
    alternCode: '',
    lastName: '',
    firstName: '',
    dateOfBirth: null,
    createdOn: null,
    deactivated: false,
    status: 1,
    identificationNumber: '',
    socialSecurityNumber: '',
    gender: null,
    paymentType: null,
    paymentAmount: null,
    bank: '',
    banckAccount: '',
    maritalStatus: null,
    payrollType: null,
    profession: '',
    organizationId: 0,
  };

  private readonly employeeContextIdSource = new BehaviorSubject<number>(0);
  employeeContextIdAction$ = this.employeeContextIdSource.asObservable();

  private readonly employeeModifiedSubject = new Subject<Action<IEmployee>>();
  private readonly employeeModifiedAction$ =
    this.employeeModifiedSubject.asObservable();

  private readonly enabledEmployeeGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableEmployeeGridAction$ = this.enabledEmployeeGridSource.asObservable();

  private readonly enabledEmployeeFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableEmployeeFormAction$ = this.enabledEmployeeFormSource.asObservable();

  employees$!: Observable<IEmployee[]>;
  employeeSelected$!: Observable<IEmployee>;
  employeeWithCRUD$!: Observable<IEmployee[]>;

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  setEmployeeContext(employeeId: number): void {
    this.employeeContextIdSource.next(employeeId ?? 0);
  }

  enableEmployeeGrid(enabled: boolean): void {
    this.enabledEmployeeGridSource.next(enabled);
  }

  enableEmployeeForm(enabled: boolean): void {
    this.enabledEmployeeFormSource.next(enabled);
  }

  addEmployee(employee: IEmployee): void {
    this.employeeModifiedSubject.next({ item: employee, action: 'add' });
  }

  updateEmployee(employee: IEmployee): void {
    this.employeeModifiedSubject.next({ item: employee, action: 'update' });
  }

  deleteEmployee(employee: IEmployee): void {
    this.employeeModifiedSubject.next({ item: employee, action: 'delete' });
  }

  private initializeObservables(): void {
    this.employees$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IEmployee[]);
        }
        return this.http
          .get<IApiResponse<IEmployee[]>>(
            `${this.employeeUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as IEmployee[]).map((row) => ({
                ...row,
                employeeId: Number(row.employeeId) || 0,
                organizationId: Number(row.organizationId) || organizationId,
                status: Number(row.status) || 1,
              }))
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

    this.employeeSelected$ = combineLatest([
      this.employees$,
      this.employeeContextIdAction$,
    ]).pipe(
      map(([employees, employeeId]) => {
        if (!employeeId || employeeId <= 0) {
          const organizationId =
            this.applicationService.workingOrganization?.organizationId ?? 0;
          return { ...this.emptyEmployee, organizationId };
        }
        return (
          employees.find((e) => e.employeeId === employeeId) ?? {
            ...this.emptyEmployee,
            organizationId:
              this.applicationService.workingOrganization?.organizationId ?? 0,
          }
        );
      })
    );

    this.employeeWithCRUD$ = merge(
      this.employees$,
      this.employeeModifiedAction$.pipe(
        concatMap((operation) => this.saveEmployee(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyEmployees(acc, value),
        [] as IEmployee[]
      )
    );
  }

  private modifyEmployees(
    employees: IEmployee[],
    operation: Action<IEmployee>
  ): IEmployee[] {
    if (operation.action === 'add') {
      return [...employees, operation.item];
    }
    if (operation.action === 'update') {
      return employees.map((employee) =>
        employee.employeeId === operation.item.employeeId
          ? operation.item
          : employee
      );
    }
    if (operation.action === 'delete') {
      return employees.filter(
        (employee) => employee.employeeId !== operation.item.employeeId
      );
    }
    return [...employees];
  }

  private employeeDisplayName(employee: IEmployee): string {
    return `${employee.lastName ?? ''} ${employee.firstName ?? ''}`.trim();
  }

  private saveEmployee(
    operation: Action<IEmployee>
  ): Observable<Action<IEmployee>> {
    const employee: IEmployee = {
      ...operation.item,
      employeeId: Number(operation.item.employeeId) || 0,
    };
    const name = this.employeeDisplayName(employee);

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.employeeUrl}/${employee.employeeId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${name}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: employee, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.employeeUrl,
            { ...employee, employeeId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.employeeUrl, employee, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${name}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...employee,
          employeeId: Number(data.result) || employee.employeeId,
        },
        action: operation.action,
      })),
      catchError(this.errorHandlerService.handleError)
    );
  }
}
