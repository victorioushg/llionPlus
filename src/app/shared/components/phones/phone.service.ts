import { Injectable, NgZone } from '@angular/core';
import { IPhone, IPhoneType } from './phone';
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
  tap,
} from 'rxjs/operators';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  merge,
  of,
  throwError,
} from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ApplicationService } from '@shared/services/applicattionService';
import { Action } from '@shared/models/edit-action';

@Injectable({
  providedIn: 'root',
})
export class PhoneService {
  private apiUrl = `${environment.API_URL}application/`;

  entityId: number = 0;
  parentRefEntityId!: number;

  phone: IPhone = {
    phoneId: 0,
    countryCode: '',
    phoneNumber: '',
    phoneType: '',
    entityId: this.parentRefEntityId,
    organizationId: this.entityId,
  };

  phonesByEntityId$!: Observable<IPhone[]>;

  private phoneSelectedSource = new BehaviorSubject<IPhone>(this.phone);
  phoneSelectedAction$ = this.phoneSelectedSource.asObservable();
  phone$ = this.phoneSelectedAction$;
  phoneTypes$!: Observable<IPhoneType[]>;

  private phoneModifiedSubject = new Subject<Action<IPhone>>();
  phoneModifiedAction$ = this.phoneModifiedSubject.asObservable();
  phoneWithCRUD$!: Observable<IPhone[]>;

  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  modifyPhone(phones: IPhone[], operation: Action<IPhone>): IPhone[] {
    if (operation.action === 'add') {
      return [...phones, operation.item];
    } else if (operation.action === 'update') {
      return phones.map((phone) =>
        phone.phoneId === operation.item.phoneId ? operation.item : phone
      );
    } else if (operation.action === 'delete') {
      return phones.filter((phone) => phone.phoneId !== operation.item.phoneId);
    }
    return [...phones];
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    
    this.applicationService.parentRefEntityId$.subscribe((result) => {
      this.parentRefEntityId = result;
    });

    this.phonesByEntityId$ = this.applicationService.entitySelectedAction$.pipe(
      switchMap((selectedEntity) => {
        return this.http
          .get<IApiResponse<IPhone[]>>(
            `${this.apiUrl}phones/${this.parentRefEntityId}/${selectedEntity}`
          )
          .pipe(
            map((data: IApiResponse) => {
              return data.result as IPhone[];
            })
          );
      })
    );

    this.phoneTypes$ = this.http
      .get<IApiResponse<IPhoneType[]>>(this.apiUrl + 'phonetypes')
      .pipe(
        map((data) => data.result),
        catchError(this.handleError),
        shareReplay(1)
      );

    this.phoneWithCRUD$ = merge(
      this.phonesByEntityId$,
      this.phoneModifiedAction$.pipe(
        concatMap((operation) => this.savePhone(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyPhone(acc, value),
        [] as IPhone[]
      )
    );
  }

  addPhone(newPhone: IPhone): void {
    this.phoneModifiedSubject.next({
      item: newPhone,
      action: 'add',
    });
  }

  deletePhone(selectedPhone: IPhone): void {
    this.phoneModifiedSubject.next({
      item: selectedPhone,
      action: 'delete',
    });
  }

  updatePhone(selectedPhone: IPhone): void {
    this.phoneModifiedSubject.next({
      item: selectedPhone,
      action: 'update',
    });
  }

  savePhone(operation: Action<IPhone>): Observable<Action<IPhone>> {
    const phone: IPhone = operation.item;
    if (operation.action === 'delete') {
      const url = `${this.apiUrl}Phone/${phone.phoneId}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `Teléfono ${operation.item.phoneNumber} eliminado`,
              toastType.success
            );
          }),
          map(() => ({ item: phone, action: operation.action })),
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
    }

    if (operation.action === 'add') {
      return this.http
        .post<IApiResponse<number>>(
          `${this.apiUrl}phone`,
          { ...phone, phoneId: 0 },
          { headers: this.headers }
        )
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `teléfono ${operation.item.phoneNumber} agregado`,
              toastType.success
            );
          }),
          map(() => ({ item: phone, action: operation.action })),
          catchError(this.handleError)
        );
    }
    if (operation.action === 'update') {
      return this.http
        .put<IApiResponse<number>>(`${this.apiUrl}phone`, phone, {
          headers: this.headers,
        })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `teléfono ${operation.item.phoneNumber} actualizado`,
              toastType.success
            );
          }),
          map(() => ({ item: phone, action: operation.action })),
          catchError(this.handleError)
        );
    }
    return of(operation);
  }

  phoneSelected(phone: IPhone) {
    this.phoneSelectedSource.next(phone);
  }

  private handleError(err: HttpErrorResponse) {
    let errorMessage: string;
    if (err.error instanceof ErrorEvent) {
      errorMessage = `An Error ocurred: ${err.error.message} `;
    } else {
      errorMessage = `Backend returned cod ${err.status}: ${err.message} `;
    }
    this.ngZone.run(() => {
      this.toastService.showMyToast(errorMessage, toastType.error);
    });
    return throwError(() => errorMessage);
  }
}
