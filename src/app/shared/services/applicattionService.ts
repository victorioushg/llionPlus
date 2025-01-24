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
import { childgrid } from '../enums/enums';

@Injectable({
  providedIn: 'root',
})
export class ApplicationService {
  private apiUrl = environment.API_URL + 'application/';

  private errorMessageSubject = new Subject<string>();
  errorMessage$ = this.errorMessageSubject.asObservable();

  private entitySelectedSource = new BehaviorSubject<number>(0);
  entitySelectedAction$ = this.entitySelectedSource.asObservable();
  entitySelected(entityId: number) {
    this.entitySelectedSource.next(entityId);
  }

  entityId$ = this.entitySelectedAction$.pipe(
    tap((data: number) => {
      console.log('appser entity - ' + data);
    })
  );

  // ParentRefEntityId
  private parentRefEntityIdSelectedSource = new BehaviorSubject<number>(0);
  parentRefEntityIdAction$ =
    this.parentRefEntityIdSelectedSource.asObservable();
  parentRefEntityIdSelected(parentRefEntityId: number) {
    this.parentRefEntityIdSelectedSource.next(parentRefEntityId);
  }

  parentRefEntityId$ = this.parentRefEntityIdAction$.pipe(
    tap((data: number) => {
      console.log('appser parentRefEntityId - ' + data);
    })
  );

  // Organization
  private enabledOrganizationGridSource = new BehaviorSubject<boolean>(false);
  enableOrganizationGridAction$: Observable<boolean> =
    this.enabledOrganizationGridSource.asObservable();
  enableOrganizationGrid(enabled: boolean) {
    this.enabledOrganizationGridSource.next(enabled);
  }
  private enabledOrganizationFormSource = new BehaviorSubject<boolean>(false);
  enableOrganizationFormAction$ =
    this.enabledOrganizationFormSource.asObservable();
  enableOrganizationForm(enabled: boolean) {
    this.enabledOrganizationFormSource.next(enabled);
  }

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

  // Users
  private enabledUserGridSource = new BehaviorSubject<boolean>(false);
  enableUserGridAction$: Observable<boolean> =
    this.enabledUserGridSource.asObservable();
  enableUserGrid(enabled: boolean) {
    this.enabledUserGridSource.next(enabled);
  }
  private enabledUserFormSource = new BehaviorSubject<boolean>(false);
  enableUserFormAction$ = this.enabledUserFormSource.asObservable();
  enableUserForm(enabled: boolean) {
    this.enabledUserFormSource.next(enabled);
  }

  constructor(private http: HttpClient, private toastService: ToastService) {}

  enableDetailForm(grid: childgrid, enable: boolean) {
    this.enableOrganizationForm(!enable);
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

  getParentRefEntityId(entityName: string): Observable<number> {
    return this.http
      .get<IApiResponse<number>>(`${this.apiUrl}entity/${entityName}`)
      .pipe(
        map((data: IApiResponse<number>) => data.result),
        catchError((err) => {
          this.errorMessageSubject.next(err);
          // console.error('Error fetching entity ID:', err);
          //throw err; // Or return a default value like 0 if needed
          return EMPTY;
        })
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
