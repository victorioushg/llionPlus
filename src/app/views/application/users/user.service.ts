import { Injectable, NgZone } from '@angular/core';
import { IRole, IUser } from './user';
import { environment } from '@environments/environment';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {
  catchError,
  map,
  take,
  tap,
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  Subject,
  throwError,
  switchMap,
  shareReplay,
  concatMap,
  scan,
} from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';
import { ApplicationService } from '@shared/services/applicattionService';
import { IOrganization } from '../organization/organization';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.API_URL + 'user';
  private apiAppUrl = environment.API_URL + 'organization';

  userWithCRUD$!: Observable<IUser[]>;
  private emptyUser: Observable<IUser> = of({
    userId: 0,
    userName: '',
    email: '',
    phoneNumber: '',
    deactivated: 0,
    firstName: '',
    lastName: '',
    displayName: '',
  }).pipe(take(1));

  users$: Observable<IUser[]> | undefined;

  private userSelectedSubject = new BehaviorSubject<number>(0);
  userSelectedAction$ = this.userSelectedSubject.asObservable();

  userSelected$: Observable<IUser> | undefined;

  organizations$!: Observable<IOrganization[]>;
  roles$!: Observable<IRole[]>;

  private userModifiedSubject = new Subject<Action<IUser>>();
  userModifiedAction$ = this.userModifiedSubject.asObservable();

  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorhandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    this.organizations$ = this.http
      .get<IApiResponse<IOrganization[]>>(this.apiAppUrl + '/all')
      .pipe(
        map((data) => data.result),
        catchError(this.errorhandlerService.handleError)
      );

    this.roles$ = this.http
      .get<IApiResponse<IRole[]>>(this.apiUrl + '/roles')
      .pipe(
        map((data) => data.result),
        catchError(this.errorhandlerService.handleError)
      );

    this.users$ = this.http
      .get<IApiResponse<IUser[]>>(this.apiUrl + '/users')
      .pipe(
        map((data) => data.result),
        catchError(this.errorhandlerService.handleError)
      );

    this.userSelected$ = combineLatest([
      this.users$,
      this.userSelectedAction$,
    ]).pipe(
      switchMap(([users, selectedUserId]) => {
        if (selectedUserId > 0) {
          return this.getUser(selectedUserId);
        } else {
          return this.emptyUser;
        }
      }),
      shareReplay(1)
    );

    this.userWithCRUD$ = merge(
      this.users$,
      this.userModifiedAction$.pipe(
        concatMap((operation) => this.saveUser(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyUsers(acc, value),
        [] as IUser[]
      ),
      shareReplay(1)
    );
  }

  modifyUsers(users: IUser[], operation: Action<IUser>): IUser[] {
    if (operation.action === 'add') {
      return [...users, operation.item];
    } else if (operation.action === 'update') {
      return users.map((user) =>
        user.userId === operation.item.userId ? operation.item : user
      );
    } else if (operation.action === 'delete') {
      return users.filter((user) => user.userId !== operation.item.userId);
    }
    return [...users];
  }

  addUser(newUser: IUser): void {
    this.userModifiedSubject.next({
      item: newUser,
      action: 'add',
    });
  }

  deleteUser(selectedUser: IUser): void {
    this.userModifiedSubject.next({
      item: selectedUser,
      action: 'delete',
    });
  }

  updateUser(selectedUser: IUser): void {
    this.userModifiedSubject.next({
      item: selectedUser,
      action: 'update',
    });
  }

  saveUser(operation: Action<IUser>): Observable<Action<IUser>> {
    const user: IUser = operation.item;

    if (operation.action === 'delete') {
      const url = `${this.apiUrl}/${user.userId}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          tap(() => {
            this.toastService.showMyToast(
              `${user.displayName}, datos eliminados`,
              toastType.success
            );
          }),
          map(() => ({ item: user, action: operation.action }))
        );
    }

    if (operation.action === 'add') {
      return this.http
        .post<IApiResponse<number>>(
          `${this.apiUrl}/user`,
          { ...user, id: 0 },
          { headers: this.headers }
        )
        .pipe(
          tap(() => {
            this.toastService.showMyToast(
              `${user.displayName}, datos almacenados`,
              toastType.success
            );
          }),
          map(() => ({ item: user, action: operation.action }))
        );
    }

    if (operation.action === 'update') {
      return this.http
        .put<IApiResponse<number>>(`${this.apiUrl}/user`, user, {
          headers: this.headers,
        })
        .pipe(
          tap(() => {
            this.toastService.showMyToast(
              `${user.displayName}, datos almacenados`,
              toastType.success
            );
          }),
          map(() => ({ item: user, action: operation.action }))
        );
    }

    return of(operation);
  }

  selectedUserChanged(selectedUserId: number): void {
    this.userSelectedSubject.next(selectedUserId);
  }

  getUser(id: number): Observable<IUser> {
    return this.http
      .get<IApiResponse<IUser>>(`${this.apiUrl}/user/${id}`)
      .pipe(map((data) =>  data.result ));
  }
}
