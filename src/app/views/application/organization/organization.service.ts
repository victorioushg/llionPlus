import { Injectable, NgZone, OnInit } from '@angular/core';
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
  private emptyOrganization: IOrganization = {
    organizationId: 0,
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
    currency: '', 
    parentId: 0,
    logoData: '',
    logoName: '',
    default: false,
  };

  entityId!: number;
  organizations$!: Observable<IOrganization[]>;

  organizationSelected$!: Observable<IOrganization>;


  organizationTypes$!: Observable<IOrganizationType[]>;
  assosiationTypes$!: Observable<IAssosiationType[]>;

  // To Delete
  // private enabledFormSource = new BehaviorSubject<boolean>(false);
  // enableFormAction$ = this.enabledFormSource.asObservable();

  // Action Stream for adding/updating/deleting products
  private organizationModifiedSubject = new Subject<Action<IOrganization>>();
  organizationModifiedAction$ = this.organizationModifiedSubject.asObservable();

  // Save the organization via http
  // And then create and buffer a new array of products with scan.
  organizationWithCRUD$!: Observable<IOrganization[]>;

  // Enabling
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
        organization.organizationId === operation.item.organizationId
          ? operation.item
          : organization
      );
    } else if (operation.action === 'delete') {
      // Filter out the deleted organization
      return organizations.filter(
        (organization) =>
          organization.organizationId !== operation.item.organizationId
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
    this.applicationService.entitySelected$.subscribe((entityId) => {
      this.entityId = entityId;
    });

    this.organizations$ = this.http
      .get<IApiResponse<IOrganization[]>>(this.organizationUrl + '/all')
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.organizationTypes$ = this.applicationService.entitySelected$.pipe(
      switchMap((entityId) => {
        this.entityId = entityId;
        return this.http.get<IApiResponse<IOrganizationType[]>>(
          `${this.organizationUrl}/organizationtypes/${this.entityId}`
        );
      }),
      map((data) => data.result),
      catchError(this.errorHandlerService.handleError)
    );

    this.assosiationTypes$ = this.applicationService.entitySelected$.pipe(
      switchMap((entityId) => {
        this.entityId = entityId;
      
        return this.http.get<IApiResponse<IAssosiationType[]>>(
          `${this.organizationUrl}/assosiationtypes/${entityId}`
        );
      }),
      map((data) => data.result),
      catchError(this.errorHandlerService.handleError)
    );

    this.organizationSelected$ = combineLatest([
      this.organizations$,
      this.applicationService.organizationIdSelectedAction$,
    ]).pipe(
      switchMap(([organizations, selectedOrganizationId]) => {
        if (selectedOrganizationId > 0) {
          return this.getOrganization(selectedOrganizationId);
        } else {
          return of(this.emptyOrganization);
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
      const url = `${this.organizationUrl}/${organization.organizationId}`;
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
          catchError((error: HttpErrorResponse) =>
            this.errorHandlerService.handleError(error)
          )
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

  getOrganization(id: number): Observable<IOrganization> {
    return this.http
      .get<IApiResponse<IOrganization>>(
        `${this.organizationUrl}/${this.entityId}/${id}`
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }
}
