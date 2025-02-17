import { Injectable, NgZone } from '@angular/core';
import {
  IAssosiationType,
  IOrganization,
  IOrganizationType,
} from './organization';
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
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  Subject,
  throwError,
  EMPTY,
} from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';

@Injectable({
  providedIn: 'root',
})
export class OrganizationService {
  private organizationUrl = environment.API_URL + 'organization';
  private emptyOrganization: Observable<IOrganization> = of({
    id: 0,
    name: '',
    activity: '',
    taxRegistrationID: '',
    taxRegistrationDescription: '',
    organizationType: '',
    assosiationType: '',
    deactivated: 0,
    addedBy: 0,
    addedOn: new Date(),
    lastUpdatedBy: 0,
    lastUpdatedOn: new Date(),
    addresses: [],
    phones: [],
    emails: [],
    parentId: 0,
    logoData: '',
    logoName: '',
    default: false, 
  }).pipe(take(1));

  organizations$!: Observable<IOrganization[]>;

  organizationTypes$!: Observable<IOrganizationType[]>;
  assosiationTypes$!: Observable<IAssosiationType[]>;

  private organizationSelectedSubject = new BehaviorSubject<number>(0);
  organizationSelectedAction$ = this.organizationSelectedSubject.asObservable();
  organizationSelected$!: Observable<IOrganization>;

  // To Delete
  // private enabledFormSource = new BehaviorSubject<boolean>(false);
  // enableFormAction$ = this.enabledFormSource.asObservable();

  // Action Stream for adding/updating/deleting products
  private organizationModifiedSubject = new Subject<Action<IOrganization>>();
  organizationModifiedAction$ = this.organizationModifiedSubject.asObservable();

  // Save the organization via http
  // And then create and buffer a new array of products with scan.
  organizationWithCRUD$!: Observable<IOrganization[]>;

  // Support methods
  // Save the organization to the backend server
  // NOTE: This could be broken into three additional methods.
  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  // Modify the array of organizations
  modifyOrganizations(
    organizations: IOrganization[],
    operation: Action<IOrganization>
  ): IOrganization[] {
    if (operation.action === 'add') {
      // Return a new array with the added organization pushed to it
      return [...organizations, operation.item];
    } else if (operation.action === 'update') {
      // Return a new array with the updated organization replaced
      return organizations.map((organization) =>
        organization.id === operation.item.id ? operation.item : organization
      );
    } else if (operation.action === 'delete') {
      // Filter out the deleted organization
      return organizations.filter(
        (organization) => organization.id !== operation.item.id
      );
    }
    return [...organizations];
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    // this.emptyOrganization = of({} as IOrganization);

    this.organizations$ = this.http
      .get<IApiResponse<IOrganization[]>>(this.organizationUrl + '/all')
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.organizationTypes$ = this.http
      .get<IApiResponse<IOrganizationType[]>>(
        this.organizationUrl + '/organizationtypes'
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.assosiationTypes$ = this.http
      .get<IApiResponse<IAssosiationType[]>>(
        this.organizationUrl + '/assosiationtypes'
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.organizationSelected$ = combineLatest([
      this.organizations$,
      this.organizationSelectedAction$,
    ]).pipe(
      switchMap(([organizations, selectedOrganizationId]) => {
        if (selectedOrganizationId > 0) {
          this.applicationService.entitySelected(selectedOrganizationId);
          return this.getOrganization(selectedOrganizationId);
        } else {
          return this.emptyOrganization;
        }
      }),
      shareReplay(1)
    );

    this.organizationWithCRUD$ = merge(
      this.organizations$,
      this.organizationModifiedAction$.pipe(
        concatMap((operation) => this.saveOrganization(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array
            ? [...value]
            : this.modifyOrganizations(acc, value),
        [] as IOrganization[]
      ),
      shareReplay(1)
    );
  }

  addOrganization(newOrganization: IOrganization): void {
    this.organizationModifiedSubject.next({
      item: newOrganization,
      action: 'add',
    });
  }

  deleteOrganization(selectedOrganization: IOrganization): void {
    this.organizationModifiedSubject.next({
      item: selectedOrganization,
      action: 'delete',
    });
  }

  updateOrganization(selectedOrganization: IOrganization): void {
    // Update a copy of the selected organization
    this.organizationModifiedSubject.next({
      item: selectedOrganization,
      action: 'update',
    });
  }

  saveOrganization(
    operation: Action<IOrganization>
  ): Observable<Action<IOrganization>> {
    const organization: IOrganization = operation.item;

    if (operation.action === 'delete') {
      const url = `${this.organizationUrl}/${organization.id}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          // Return the original organization so it can be removed from the array
          tap((data) => {
            this.toastService.showMyToast(
              `${organization.name}, datos eliminados`,
              toastType.success
            );
          }),

          map(() => ({ item: organization, action: operation.action })),
          catchError((error: HttpErrorResponse) => this.errorHandlerService.handleError(error))
        );
    }

    if (operation.action === 'add' || operation.action === 'update') {
      return this.http
        .post<IApiResponse<number>>(
          this.organizationUrl,
          operation.action === 'add'
            ? { ...organization, id: 0 }
            : organization,
          {
            headers: this.headers,
          }
        )
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `${organization.name}, datos almacenados`,
              toastType.success
            );
          }),
          // Return the original organization so it can replace the organization in the array
          map(() => ({ item: organization, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    // If there is no operation, return the organization
    return of(operation);
  }

  selectedOrganizationChanged(selectedOrganizationId: number): void {
    this.organizationSelectedSubject.next(selectedOrganizationId);
  }

  getOrganization(id: number): Observable<IOrganization> {
    return this.http
      .get<IApiResponse<IOrganization>>(this.organizationUrl + '/' + id)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }
 
}
