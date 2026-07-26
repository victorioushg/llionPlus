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
import { IProvider } from './provider';

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  private readonly providerUrl = environment.API_URL + 'providers';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly emptyProvider: IProvider = {
    providerId: 0,
    alternCode: '',
    description: '',
    taxRegistrationID: '',
    taxRegistrationID2: '',
    providerAssignedCode: '',
    debitLimit: null,
    debitAvailable: null,
    deactivated: false,
    comment: '',
    organizationId: 0,
  };

  private readonly providerContextIdSource = new BehaviorSubject<number>(0);
  providerContextIdAction$ = this.providerContextIdSource.asObservable();

  private readonly providerModifiedSubject = new Subject<Action<IProvider>>();
  private readonly providerModifiedAction$ =
    this.providerModifiedSubject.asObservable();

  private readonly enabledProviderGridSource = new BehaviorSubject<boolean>(
    false
  );
  enableProviderGridAction$ = this.enabledProviderGridSource.asObservable();

  private readonly enabledProviderFormSource = new BehaviorSubject<boolean>(
    false
  );
  enableProviderFormAction$ = this.enabledProviderFormSource.asObservable();

  providers$!: Observable<IProvider[]>;
  providerSelected$!: Observable<IProvider>;
  providerWithCRUD$!: Observable<IProvider[]>;

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  setProviderContext(providerId: number): void {
    this.providerContextIdSource.next(providerId ?? 0);
  }

  enableProviderGrid(enabled: boolean): void {
    this.enabledProviderGridSource.next(enabled);
  }

  enableProviderForm(enabled: boolean): void {
    this.enabledProviderFormSource.next(enabled);
  }

  addProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'add' });
  }

  updateProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'update' });
  }

  deleteProvider(provider: IProvider): void {
    this.providerModifiedSubject.next({ item: provider, action: 'delete' });
  }

  private initializeObservables(): void {
    this.providers$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IProvider[]);
        }
        return this.http
          .get<IApiResponse<IProvider[]>>(
            `${this.providerUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              ((data.result ?? []) as IProvider[]).map((row) => ({
                ...row,
                providerId: Number(row.providerId) || 0,
                organizationId: Number(row.organizationId) || organizationId,
              }))
            ),
            catchError(this.errorHandlerService.handleError)
          );
      })
    );

    this.providerSelected$ = combineLatest([
      this.providers$,
      this.providerContextIdAction$,
    ]).pipe(
      map(([providers, providerId]) => {
        if (!providerId || providerId <= 0) {
          const organizationId =
            this.applicationService.workingOrganization?.organizationId ?? 0;
          return { ...this.emptyProvider, organizationId };
        }
        return (
          providers.find((p) => p.providerId === providerId) ?? {
            ...this.emptyProvider,
            organizationId:
              this.applicationService.workingOrganization?.organizationId ?? 0,
          }
        );
      })
    );

    this.providerWithCRUD$ = merge(
      this.providers$,
      this.providerModifiedAction$.pipe(
        concatMap((operation) => this.saveProvider(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyProviders(acc, value),
        [] as IProvider[]
      )
    );
  }

  private modifyProviders(
    providers: IProvider[],
    operation: Action<IProvider>
  ): IProvider[] {
    if (operation.action === 'add') {
      return [...providers, operation.item];
    }
    if (operation.action === 'update') {
      return providers.map((provider) =>
        provider.providerId === operation.item.providerId
          ? operation.item
          : provider
      );
    }
    if (operation.action === 'delete') {
      return providers.filter(
        (provider) => provider.providerId !== operation.item.providerId
      );
    }
    return [...providers];
  }

  private saveProvider(
    operation: Action<IProvider>
  ): Observable<Action<IProvider>> {
    const provider: IProvider = {
      ...operation.item,
      providerId: Number(operation.item.providerId) || 0,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.providerUrl}/${provider.providerId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() =>
            this.toastService.showMyToast(
              `${provider.description}, datos eliminados`,
              toastType.success
            )
          ),
          map(() => ({ item: provider, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
        );
    }

    const request$ =
      operation.action === 'add'
        ? this.http.post<IApiResponse<number>>(
            this.providerUrl,
            { ...provider, providerId: 0 },
            { headers: this.headers }
          )
        : this.http.put<IApiResponse<number>>(this.providerUrl, provider, {
            headers: this.headers,
          });

    return request$.pipe(
      tap(() =>
        this.toastService.showMyToast(
          `${provider.description}, datos almacenados`,
          toastType.success
        )
      ),
      map((data) => ({
        item: {
          ...provider,
          providerId: Number(data.result) || provider.providerId,
        },
        action: operation.action,
      })),
      catchError(this.errorHandlerService.handleError)
    );
  }
}
