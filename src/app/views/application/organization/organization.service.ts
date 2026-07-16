import { Injectable, NgZone, OnInit } from '@angular/core';
import {
  IAssosiationType,
  ICurrency,
  IOrganization,
  IOrganizationCreditDebit,
  IOrganizationExchangeRate,
  IOrganizationParameter,
  IOrganizationTax,
  IOrganizationTaxRetention,
  IOrganizationType,
  IOrigin,
  IParameterType,
} from './organization';
import { IAppEntity } from '@shared/models/entity';
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
import { IGroup } from '@shared/models/group';
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
  private applicationUrl = environment.API_URL + 'application/';
  private readonly taxTypeGroupModule = 'Tax Type';
  private readonly taxTypeEntityId = 1;
  private readonly taxTypeOrganizationId = 1;
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
  organizationTaxes$!: Observable<IOrganizationTax[]>;
  organizationTaxRetentions$!: Observable<IOrganizationTaxRetention[]>;
  organizationExchangeRates$!: Observable<IOrganizationExchangeRate[]>;
  organizationParameters$!: Observable<IOrganizationParameter[]>;
  organizationCredits$!: Observable<IOrganizationCreditDebit[]>;
  parameterTypes$!: Observable<IParameterType[]>;
  origins$!: Observable<IOrigin[]>;
  taxTypes$!: Observable<IGroup[]>;
  entities$!: Observable<IAppEntity[]>;

  private taxesRefreshSubject = new BehaviorSubject<number>(0);
  private retentionsRefreshSubject = new BehaviorSubject<number>(0);
  private exchangesRefreshSubject = new BehaviorSubject<number>(0);
  private parametersRefreshSubject = new BehaviorSubject<number>(0);
  private creditsRefreshSubject = new BehaviorSubject<number>(0);

  /** Organization selected in the organizations grid (child tabs/grids). */
  private organizationContextIdSource = new BehaviorSubject<number>(0);
  organizationContextIdAction$ =
    this.organizationContextIdSource.asObservable();

  setOrganizationContext(organizationId: number): void {
    this.organizationContextIdSource.next(organizationId ?? 0);
  }

  get organizationContextId(): number {
    return this.organizationContextIdSource.value;
  }

  organizationTypes$!: Observable<IOrganizationType[]>;
  assosiationTypes$!: Observable<IAssosiationType[]>;
  currencies$!: Observable<ICurrency[]>;

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

    this.applicationService.getEntityId('Organization').subscribe((entityId) => {
      this.entityId = entityId;
      this.applicationService.entitySelected(entityId);
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

    this.currencies$ = this.http
      .get<IApiResponse<ICurrency[]>>(`${this.organizationUrl}/currencies`)
      .pipe(
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

    this.organizationTaxes$ = combineLatest([
      this.organizationContextIdAction$,
      this.taxesRefreshSubject,
    ]).pipe(
      switchMap(([organizationId]) =>
        !organizationId || organizationId <= 0
          ? of([])
          : this.getOrganizationTaxes(organizationId)
      ),
      shareReplay(1)
    );

    this.organizationTaxRetentions$ = combineLatest([
      this.organizationContextIdAction$,
      this.retentionsRefreshSubject,
    ]).pipe(
      switchMap(([organizationId]) =>
        !organizationId || organizationId <= 0
          ? of([])
          : this.getOrganizationTaxRetentions(organizationId)
      ),
      shareReplay(1)
    );

    this.organizationExchangeRates$ = combineLatest([
      this.organizationContextIdAction$,
      this.exchangesRefreshSubject,
    ]).pipe(
      switchMap(([organizationId]) =>
        !organizationId || organizationId <= 0
          ? of([])
          : this.getOrganizationExchangeRates(organizationId)
      ),
      shareReplay(1)
    );

    this.organizationParameters$ = combineLatest([
      this.organizationContextIdAction$,
      this.parametersRefreshSubject,
    ]).pipe(
      switchMap(([organizationId]) =>
        !organizationId || organizationId <= 0
          ? of([])
          : this.getOrganizationParameters(organizationId)
      ),
      shareReplay(1)
    );

    this.organizationCredits$ = combineLatest([
      this.organizationContextIdAction$,
      this.creditsRefreshSubject,
    ]).pipe(
      switchMap(([organizationId]) =>
        !organizationId || organizationId <= 0
          ? of([])
          : this.getOrganizationCredits(organizationId)
      ),
      shareReplay(1)
    );

    this.parameterTypes$ = this.getParameterTypes().pipe(shareReplay(1));
    this.origins$ = this.getOrigins().pipe(shareReplay(1));
    this.taxTypes$ = this.getTaxTypes().pipe(shareReplay(1));
    this.entities$ = this.applicationService.entities$;

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

  getOrganizationTaxes(id: number): Observable<IOrganizationTax[]> {
    return this.http
      .get<IApiResponse<IOrganizationTax[]>>(
        `${this.organizationUrl}/taxes/${id}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError)
      );
  }

  refreshTaxes(): void {
    this.taxesRefreshSubject.next(this.taxesRefreshSubject.value + 1);
  }

  addTax(tax: IOrganizationTax): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.organizationUrl}/tax`, tax, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto almacenado',
            toastType.success
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  updateTax(tax: IOrganizationTax): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.organizationUrl}/tax`, tax, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto actualizado',
            toastType.success
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  deleteTax(taxId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.organizationUrl}/tax/${taxId}`, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto eliminado',
            toastType.success
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getOrganizationTaxRetentions(
    id: number
  ): Observable<IOrganizationTaxRetention[]> {
    return this.http
      .get<IApiResponse<IOrganizationTaxRetention[]>>(
        `${this.organizationUrl}/retentions/${id}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError)
      );
  }

  refreshRetentions(): void {
    this.retentionsRefreshSubject.next(
      this.retentionsRefreshSubject.value + 1
    );
  }

  addRetention(item: IOrganizationTaxRetention): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(
        `${this.organizationUrl}/retention`,
        item,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Retención almacenada',
            toastType.success
          );
          this.refreshRetentions();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  updateRetention(item: IOrganizationTaxRetention): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(
        `${this.organizationUrl}/retention`,
        item,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Retención actualizada',
            toastType.success
          );
          this.refreshRetentions();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  deleteRetention(taxRetentionId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.organizationUrl}/retention/${taxRetentionId}`,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Retención eliminada',
            toastType.success
          );
          this.refreshRetentions();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getOrganizationCredits(
    id: number
  ): Observable<IOrganizationCreditDebit[]> {
    return this.http
      .get<IApiResponse<IOrganizationCreditDebit[]>>(
        `${this.organizationUrl}/credits/${id}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError)
      );
  }

  refreshCredits(): void {
    this.creditsRefreshSubject.next(this.creditsRefreshSubject.value + 1);
  }

  addCredit(item: IOrganizationCreditDebit): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.organizationUrl}/credit`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Crédito / débito almacenado',
            toastType.success
          );
          this.refreshCredits();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  updateCredit(item: IOrganizationCreditDebit): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.organizationUrl}/credit`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Crédito / débito actualizado',
            toastType.success
          );
          this.refreshCredits();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  deleteCredit(creditDebitId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.organizationUrl}/credit/${creditDebitId}`,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Crédito / débito eliminado',
            toastType.success
          );
          this.refreshCredits();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getOrganizationExchangeRates(
    id: number
  ): Observable<IOrganizationExchangeRate[]> {
    return this.http
      .get<IApiResponse<IOrganizationExchangeRate[]>>(
        `${this.organizationUrl}/exchanges/${id}`
      )
      .pipe(
        map((data) =>
          (data.result ?? []).map((item) => ({
            ...item,
            interchangeDate: new Date(item.interchangeDate),
            originalInterchangeDate: new Date(item.interchangeDate),
            originalCurrency: item.currency,
          }))
        ),
        catchError(this.errorHandlerService.handleError)
      );
  }

  refreshExchanges(): void {
    this.exchangesRefreshSubject.next(this.exchangesRefreshSubject.value + 1);
  }

  addExchange(item: IOrganizationExchangeRate): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.organizationUrl}/exchange`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Tipo de cambio almacenado',
            toastType.success
          );
          this.refreshExchanges();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  updateExchange(item: IOrganizationExchangeRate): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.organizationUrl}/exchange`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Tipo de cambio actualizado',
            toastType.success
          );
          this.refreshExchanges();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  deleteExchange(item: IOrganizationExchangeRate): Observable<number> {
    const interchangeDate = new Date(item.interchangeDate).toISOString();
    return this.http
      .delete<IApiResponse<number>>(`${this.organizationUrl}/exchange`, {
        headers: this.headers,
        params: {
          organizationId: String(item.organizationId),
          currency: item.currency,
          interchangeDate,
        },
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Tipo de cambio eliminado',
            toastType.success
          );
          this.refreshExchanges();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getTaxTypes(): Observable<IGroup[]> {
    return this.http
      .get<IApiResponse<IGroup[]>>(
        `${this.applicationUrl}groups/${encodeURIComponent(this.taxTypeGroupModule)}/${this.taxTypeEntityId}/${this.taxTypeOrganizationId}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getOrganizationParameters(
    id: number
  ): Observable<IOrganizationParameter[]> {
    return this.http
      .get<IApiResponse<IOrganizationParameter[]>>(
        `${this.organizationUrl}/parameters/${id}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getParameterTypes(): Observable<IParameterType[]> {
    return this.http
      .get<IApiResponse<IParameterType[]>>(
        `${this.organizationUrl}/parametertypes`
      )
      .pipe(
        map((data) =>
          (data.result ?? []).map((item: any) => ({
            parameterType: String(
              item.parameterType ?? item.ParameterType ?? ''
            ),
          }))
        ),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getOrigins(): Observable<IOrigin[]> {
    return this.http
      .get<IApiResponse<IOrigin[]>>(`${this.organizationUrl}/origins`)
      .pipe(
        map((data) =>
          (data.result ?? []).map((item: any) => {
            const origin = String(
              item.origin ?? item.Origin ?? item.module ?? item.Module ?? ''
            );
            const originDescription = String(
              item.originDescription ??
                item.OriginDescription ??
                origin
            );
            return {
              origin,
              originDescription,
              originEnglish:
                item.originEnglish ?? item.OriginEnglish ?? undefined,
              entityId: item.entityId ?? item.EntityId ?? null,
              module: origin,
              displayText: originDescription || origin,
            } as IOrigin;
          })
        ),
        catchError(this.errorHandlerService.handleError)
      );
  }

  refreshParameters(): void {
    this.parametersRefreshSubject.next(this.parametersRefreshSubject.value + 1);
  }

  addParameter(item: IOrganizationParameter): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.organizationUrl}/parameter`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Parámetro almacenado',
            toastType.success
          );
          this.refreshParameters();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  updateParameter(item: IOrganizationParameter): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.organizationUrl}/parameter`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Parámetro actualizado',
            toastType.success
          );
          this.refreshParameters();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  deleteParameter(parameterId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.organizationUrl}/parameter/${parameterId}`,
        { headers: this.headers }
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Parámetro eliminado',
            toastType.success
          );
          this.refreshParameters();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }

  getEntities(): Observable<IAppEntity[]> {
    return this.applicationService.getEntities();
  }
}
