import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  map,
  Observable,
  Subject,
  tap,
} from 'rxjs';
import { IApiResponse } from '../models/api-response';
import '@lib/string';
import { ToastService } from './toastService';
import { ErrorHandlerService } from './errorHandlerService';
import { childgrid } from '../enums/enums';


@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  private apiUrl = environment.API_URL + 'application/';

  private errorMessageSubject = new Subject<string>();

  entityId!: number; 

  errorMessage$ = this.errorMessageSubject.asObservable();

  // Organization Selected
  private organizationIdSelectedSource = new BehaviorSubject<number>(0);
  organizationIdSelectedAction$ = this.organizationIdSelectedSource.asObservable();
  organizationIdSelected(organizationId: number) {
    this.organizationIdSelectedSource.next(organizationId);
  }

  organizationIdSelected$ = this.organizationIdSelectedAction$.pipe(
    tap((data: number) => {
      //  console.log('appser organization - ' + data);
    })
  );

  // Entity Selected 
  private entitySelectedSource = new BehaviorSubject<number>(0);
  entitySelectedAction$ = this.entitySelectedSource.asObservable();
  entitySelected(entityId: number) {
    this.entitySelectedSource.next(entityId);
  }

  entitySelected$ = this.entitySelectedAction$.pipe(
    tap((data: number) => {
      console.log('Entity - ' + data);
    })
  );

  // Address
  private enabledAddressChildGridSource = new BehaviorSubject<boolean>(false);
  enableAddressChildGridAction$ =
    this.enabledAddressChildGridSource.asObservable();
  enableAddressChildGrid(enabled: boolean) {
    this.enabledAddressChildGridSource.next(enabled);
  }
  private enabledAddressChildFormSource = new BehaviorSubject<boolean>(false);
  enableAddressChildFormAction$ =
    this.enabledAddressChildFormSource.asObservable();
  enableAddressChildForm(enabled: boolean) {
    this.enabledAddressChildFormSource.next(enabled);
  }

  // Email
  private enabledEmailChildGridSource = new BehaviorSubject<boolean>(false);
  enableEmailChildGridAction$ = this.enabledEmailChildGridSource.asObservable();
  enableEmailChildGrid(enabled: boolean) {
    this.enabledEmailChildGridSource.next(enabled);
  }
  private enabledEmailChildFormSource = new BehaviorSubject<boolean>(false);
  enableEmailChildFormAction$ = this.enabledEmailChildFormSource.asObservable();
  enableEmailChildForm(enabled: boolean) {
    this.enabledEmailChildFormSource.next(enabled);
  }

  // Phone
  private enabledPhoneChildGridSource = new BehaviorSubject<boolean>(false);
  enablePhoneChildGridAction$ = this.enabledPhoneChildGridSource.asObservable();
  enablePhoneChildGrid(enabled: boolean) {
    this.enabledPhoneChildGridSource.next(enabled);
  }
  private enabledPhoneChildFormSource = new BehaviorSubject<boolean>(false);
  enablePhoneChildFormAction$ = this.enabledPhoneChildFormSource.asObservable();
  enablePhoneChildForm(enabled: boolean) {
    this.enabledPhoneChildFormSource.next(enabled);
  }

  // // Users
  // private enabledUserGridSource = new BehaviorSubject<boolean>(false);
  // enableUserGridAction$: Observable<boolean> =
  //   this.enabledUserGridSource.asObservable();
  // enableUserGrid(enabled: boolean) {
  //   this.enabledUserGridSource.next(enabled);
  // }
  // private enabledUserFormSource = new BehaviorSubject<boolean>(false);
  // enableUserFormAction$ = this.enabledUserFormSource.asObservable();
  // enableUserForm(enabled: boolean) {
  //   this.enabledUserFormSource.next(enabled);
  // }

  constructor(
    private http: HttpClient, 
    private toastService: ToastService,
    private errorHandler: ErrorHandlerService) {}

  enableDetailForm(grid: childgrid, enable: boolean) {
    this.enablePhoneChildGrid(!enable);
    this.enableAddressChildGrid(!enable);
    this.enableEmailChildGrid(!enable);

    switch (grid) {
      case childgrid.Address:
        this.enableAddressChildForm(enable);
        break;
      case childgrid.Email:
        this.enableEmailChildForm(enable);
        break;
      case childgrid.Phone:
        this.enablePhoneChildForm(enable);
        break;
    }
  }

  getEntityId(entityName: string): Observable<number> {
    return this.http
      .get<IApiResponse<number>>(`${this.apiUrl}entity/${entityName}`)
      .pipe(
        map(response => response.result),
        tap(entityId => this.entitySelectedSource.next(entityId)), // 🔥 push here
        catchError(this.errorHandler.handleError.bind(this.errorHandler))
      );
  }

  capitalizeJsonObject(json: any) {
    return Object.assign(
      {},
      ...Object.keys(json).map((key) => ({ [key.capitalize()]: json[key] }))
    );
  }

  WhenReady(test: Function, work: Function) {
    if (test()) work();
    else setTimeout(this.WhenReady.bind(window, test, work));
  }

  
}


