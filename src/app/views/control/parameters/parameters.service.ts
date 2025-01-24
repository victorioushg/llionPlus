import { Injectable, NgZone } from '@angular/core';
import { IParameter } from './parameter';
import { environment } from '@environments/environment';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {
  catchError,
  concatMap,
  map,
  scan,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import {
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  Subject,
  throwError,
} from 'rxjs';
import { IApiResponse } from '@app/shared/models/api-response';
import { ApplicationService } from '@app/shared/services/applicattionService';
import { ToastService } from '@app/shared/services/toastService';
import { toastType } from '@app/shared/enums/enums';
import { Action } from '@app/shared/models/edit-action';

@Injectable({
  providedIn: 'root',
})
export class ParametersService {
  private apiUrl = environment.API_URL + 'control';

  // private emptyUser: Observable<IUser> = of({
  //   userId: 0,
  //   userName: '',
  //   email: '',
  //   phoneNumber: '',
  //   deactivated: 0,
  //   firstName: '',
  //   lastName: '',
  //   displayName: '',
  // }).pipe(take(1));

  parameters$ = this.http.get<IApiResponse<IParameter[]>>(`${this.apiUrl}/parameters/{organizationId}`).pipe(
    map((data) => data.result),
  );

  private parameterSelectedSubject = new BehaviorSubject<number>(0);
  parameterSelectedAction$ = this.parameterSelectedSubject.asObservable();

  // userSelected$ = combineLatest([this.users$, this.userSelectedAction$]).pipe(
  //   switchMap(([users, selectedUserId]) => {
  //     if (selectedUserId > 0) {
  //       return this.getUser(selectedUserId);
  //     } else {
  //       return this.emptyUser;
  //     }
  //   }),
  //   shareReplay(1)
  // );

  // private userModifiedSubject = new Subject<Action<IUser>>();
  // userModifiedAction$ = this.userModifiedSubject.asObservable();

  // userWithCRUD$ = merge(
  //   this.users$,
  //   this.userModifiedAction$.pipe(
  //     concatMap((operation) => this.saveUser(operation))
  //   )
  // ).pipe(
  //   scan(
  //     (acc, value) =>
  //       value instanceof Array ? [...value] : this.modifyUsers(acc, value),
  //     [] as IUser[]
  //   ),
  //   shareReplay(1)
  // );

  // headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  // modifyUsers(users: IUser[], operation: Action<IUser>): IUser[] {
  //   if (operation.action === 'add') {
  //     // Return a new array with the added organization pushed to it
  //     return [...users, operation.item];
  //   } else if (operation.action === 'update') {
  //     // Return a new array with the updated organization replaced
  //     return users.map((user) =>
  //       user.userId === operation.item.userId ? operation.item : user
  //     );
  //   } else if (operation.action === 'delete') {
  //     // Filter out the deleted organization
  //     return users.filter((user) => user.userId !== operation.item.userId);
  //   }
  //   return [...users];
  // }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {}

  // addUser(newUser: IUser): void {
  //   this.userModifiedSubject.next({
  //     item: newUser,
  //     action: 'add',
  //   });
  // }

  // deleteUser(selectedUser: IUser): void {
  //   this.userModifiedSubject.next({
  //     item: selectedUser,
  //     action: 'delete',
  //   });
  // }

  // updateUser(selectedUser: IUser): void {
  //   this.userModifiedSubject.next({
  //     item: selectedUser,
  //     action: 'update',
  //   });
  // }

  // saveUser(
  //   operation: Action<IUser>
  // ): Observable<Action<IUser>> {
  //   const user: IUser = operation.item;

  //   if (operation.action === 'delete') {
  //     const url = `${this.apiUrl}/${user.userId}`;
  //     return this.http
  //       .delete<IApiResponse<number>>(url, { headers: this.headers })
  //       .pipe(
  //         tap((data) => {
  //           this.toastService.showMyToast(
  //             `${user.displayName}, datos eliminados`,
  //             toastType.success
  //           );
  //         }),

  //         map(() => ({ item: user, action: operation.action })),
  //         catchError((error: HttpErrorResponse) => this.handleError(error))
  //       );
  //   }
  //   if (operation.action === 'add') {
  //     return this.http
  //       .post<IApiResponse<number>>( `${this.apiUrl}/user`, { ...user, id: 0 }, { headers: this.headers, } )
  //       .pipe(
  //         tap((data) => {
  //           this.toastService.showMyToast(
  //             `${user.displayName}, datos almacenados`,
  //             toastType.success
  //           );
  //         }),
  //         map(() => ({ item: user, action: operation.action })),
  //         catchError(this.handleError)
  //       );
  //   }

  //   if (operation.action === 'update') {
  //     return this.http
  //       .put<IApiResponse<number>>( `${this.apiUrl}/user`, user, { headers: this.headers, }
  //       )
  //       .pipe(
  //         tap((data) => {
  //           this.toastService.showMyToast(
  //             `${user.displayName}, datos almacenados`,
  //             toastType.success
  //           );
  //         }),
  //         map(() => ({ item: user, action: operation.action })),
  //         catchError(this.handleError)
  //       );
  //   }

  //   return of(operation);
  // }

  // selectedUserChanged(selectedUserId: number): void {
  //   this.userSelectedSubject.next(selectedUserId);
  // }

  // getUser(id: number): Observable<IUser | undefined> {
  //   return this.http.get<IApiResponse<IUser>>(`${this.apiUrl}/${id}`).pipe(
  //     map((data) => data.result),
  //     catchError(this.handleError)
  //   );
  // }

}
