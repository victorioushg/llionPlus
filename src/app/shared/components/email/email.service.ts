import { Injectable, NgZone } from '@angular/core';
import { IEmail } from './email';
import { environment } from '@environments/environment';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, concatMap, map, scan, shareReplay, switchMap, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, Subject, combineLatest, merge, of, throwError } from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { Action } from '@shared/models/edit-action';
import { toastType } from '@shared/enums/enums';

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private apiUrl = `${environment.API_URL}application/`;

  entityId: number = 0;
  parentRefEntityId!: number;
  email: IEmail = {
    emailId: 0,
    emailAddress: '',
    entityId: this.parentRefEntityId,
    organizationId: this.entityId,
  };

  emailsByEntityId$!: Observable<IEmail[]>;

  private emailSelectedSource = new BehaviorSubject<IEmail>(this.email);
  emailSelectedAction$ = this.emailSelectedSource.asObservable();
  email$ = this.emailSelectedAction$;

  private emailModifiedSubject = new Subject<Action<IEmail>>();
  emailModifiedAction$ = this.emailModifiedSubject.asObservable();
  emailWithCRUD$!: Observable<IEmail[]>;  

  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  modifyEmail(emails: IEmail[], operation: Action<IEmail>): IEmail[] {
    if (operation.action === 'add') {
      return [...emails, operation.item];
    } else if (operation.action === 'update') {
      return emails.map((email) =>
        email.emailId === operation.item.emailId ? operation.item : email
      );
    } else if (operation.action === 'delete') {
      return emails.filter((email) => email.emailId !== operation.item.emailId);
    }
    return [...emails];
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
    
    this.applicationService.parentRefEntityId$.subscribe(
      (result) => {
        this.parentRefEntityId = result;
      }
    );

    this.emailsByEntityId$ = this.applicationService.entitySelectedAction$.pipe(
      switchMap((selectedEntity) => {
        return this.http
          .get<IApiResponse<IEmail[]>>(
            `${this.apiUrl}emails/${this.parentRefEntityId}/${selectedEntity}`
          )
          .pipe(
            map((data: IApiResponse) => {
              return data.result as IEmail[];
            })
          );
      })
    );

    this.emailWithCRUD$ = merge(
    this.emailsByEntityId$,
    this.emailModifiedAction$.pipe(
      concatMap((operation) => this.saveEmail(operation))
    )
  ).pipe(
    scan(
      (acc, value) =>
        value instanceof Array ? [...value] : this.modifyEmail(acc, value),
      [] as IEmail[]
    )
  );

  }
  

  addEmail(newAddress: IEmail): void {
    this.emailModifiedSubject.next({
      item: newAddress,
      action: 'add',
    });
  }

  deleteEmail(selectedEmail: IEmail): void {
    this.emailModifiedSubject.next({
      item: selectedEmail,
      action: 'delete',
    });
  }

  updateEmail(selectedEmail: IEmail): void {
    this.emailModifiedSubject.next({
      item: selectedEmail,
      action: 'update',
    });
  }

  saveEmail(operation: Action<IEmail>): Observable<Action<IEmail>> {
    const email: IEmail = operation.item;
    if (operation.action === 'delete') {
      const url = `${this.apiUrl}email/${email.emailId}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `email ${operation.item.emailAddress} ha sido eliminado`,
              toastType.success
            );
          }),
          map(() => ({ item: email, action: operation.action })),
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
    }

    if (operation.action === 'add') {
      return this.http
        .post<IApiResponse<number>>(
          `${this.apiUrl}email`,
          { ...email, emailId: 0 },
          { headers: this.headers }
        )
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `email ${operation.item.emailAddress} agregado`,
              toastType.success
            );
          }),
          map(() => ({ item: email, action: operation.action })),
          catchError(this.handleError)
        );
    }
    if (operation.action === 'update') {
      return this.http
        .put<IApiResponse<number>>(`${this.apiUrl}email`, email, {
          headers: this.headers,
        })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `email ${operation.item.emailAddress} actualizado`,
              toastType.success
            );
          }),
          map(() => ({ item: email, action: operation.action })),
          catchError(this.handleError)
        );
    }
    return of(operation);
  }

  emailSelected(email: IEmail) {
    this.emailSelectedSource.next(email);
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
