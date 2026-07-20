import { Injectable } from '@angular/core';
import {
  IMerchandise,
  IMerchandiseCode,
  IMerchandiseMedia,
  IMerchandisePrice,
  IMerchandiseProfile,
  IMerchandiseTax,
  IMerchandiseUom,
} from './merchandise';

import {
  IMerchandiseMovement,
  IMerchandiseWithMovements,
} from './merchandise-movements/merchandisemovement';

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
  BehaviorSubject,
  combineLatest,
  merge,
  Observable,
  of,
  Subject,
  EMPTY,
  forkJoin,
} from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { IGroup } from '@app/shared/models/group';
import { IOrganizationTax } from '@views/application/organization/organization';

@Injectable({
  providedIn: 'root',
})
export class MerchandiseService {
  private merchandiseUrl = environment.API_URL + 'merchandise';
  private merchandiseChildGridUrl = environment.API_URL + 'Merchandise';
  private organizationUrl = environment.API_URL + 'organization';

  //
  //
  emptyMerchandise: IMerchandise = {} as IMerchandise;

  private organizationId: number = 1;

  get currentOrganizationId(): number {
    return this.organizationId;
  }

  merchandises$!: Observable<IMerchandise[]>;
  merchandiseBrands$!: Observable<IGroup[]>;
  merchandiseCategories$!: Observable<IGroup[]>;
  merchandiseDivisions$!: Observable<IGroup[]>;
  merchandiseTypes$!: Observable<IGroup[]>;
  /** Organization taxes — used as lookup for merchandise tax grid */
  organizationTaxes$!: Observable<IOrganizationTax[]>;

  movements$!: Observable<IMerchandiseMovement[]>;

  private merchandiseSelectedSubject = new BehaviorSubject<number>(0);
  merchandiseSelectedAction$ = this.merchandiseSelectedSubject.asObservable();
  merchandiseWithMovements$!: Observable<IMerchandiseWithMovements>;
  merchandiseSelected$!: Observable<IMerchandise>;
  merchandiseMovements$!: Observable<IMerchandiseMovement[]>;
  merchandiseUom$!: Observable<IMerchandiseUom[]>;
  merchandiseCodes$!: Observable<IMerchandiseCode[]>;
  merchandiseTaxes$!: Observable<IMerchandiseTax[]>;
  merchandiseMedia$!: Observable<IMerchandiseMedia[]>;
  merchandiseProfiles$!: Observable<IMerchandiseProfile[]>;
  merchandisePrices$!: Observable<IMerchandisePrice[]>;
  movementTypes$!: Observable<IGroup[]>;
  codeTypes$!: Observable<IGroup[]>;

  private movementsRefreshSubject = new BehaviorSubject<number>(0);
  private codesRefreshSubject = new BehaviorSubject<number>(0);
  private taxesRefreshSubject = new BehaviorSubject<number>(0);
  private mediaRefreshSubject = new BehaviorSubject<number>(0);
  private profilesRefreshSubject = new BehaviorSubject<number>(0);
  private orgTaxesRefreshSubject = new BehaviorSubject<number>(0);

  // Used by grid double-click to ensure the detail form loads.
  merchandiseIdSelected(merchandiseId: number): void {
    this.merchandiseSelectedSubject.next(merchandiseId);
  }

  // To Delete
  // private enabledFormSource = new BehaviorSubject<boolean>(false);
  // enableFormAction$ = this.enabledFormSource.asObservable();

  // Action Stream for adding/updating/deleting products
  private merchandiseModifiedSubject = new Subject<Action<IMerchandise>>();
  merchandiseModifiedAction$ = this.merchandiseModifiedSubject.asObservable();
  private merchandiseFormActionSubject = new Subject<'save' | 'cancel'>();
  merchandiseFormAction$ = this.merchandiseFormActionSubject.asObservable();

  // Save the merchandise via http
  // And then create and buffer a new array of products with scan.
  merchandiseWithCRUD$!: Observable<IMerchandise[]>;
  // Enabling
  private enabledMerchandiseGridSource = new BehaviorSubject<boolean>(false);
  enableMerchandiseGridAction$: Observable<boolean> =
    this.enabledMerchandiseGridSource.asObservable();
  enableMerchandiseGrid(enabled: boolean) {
    this.enabledMerchandiseGridSource.next(enabled);
  }
  private enabledMerchandiseFormSource = new BehaviorSubject<boolean>(false);
  enableMerchandiseFormAction$ =
    this.enabledMerchandiseFormSource.asObservable();
  enableMerchandiseForm(enabled: boolean) {
    this.enabledMerchandiseFormSource.next(enabled);
  }

  // Support methods
  // Save the merchandise to the backend server
  // NOTE: This could be broken into three additional methods.
  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  // Modify the array of merchandises
  modifyMerchandises(
    merchandises: IMerchandise[],
    operation: Action<IMerchandise>,
  ): IMerchandise[] {
    if (operation.action === 'add') {
      // Return a new array with the added merchandise pushed to it
      return [...merchandises, operation.item];
    } else if (operation.action === 'update') {
      // Return a new array with the updated merchandise replaced
      return merchandises.map((merchandise) =>
        merchandise.merchandiseId === operation.item.merchandiseId
          ? operation.item
          : merchandise,
      );
    } else if (operation.action === 'delete') {
      // Filter out the deleted merchandise
      return merchandises.filter(
        (merchandise) =>
          merchandise.merchandiseId !== operation.item.merchandiseId,
      );
    }
    return [...merchandises];
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService,
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    // Catalog
    this.merchandises$ = this.http
      .get<
        IApiResponse<IMerchandise[]>
      >(`${this.merchandiseUrl}/${this.organizationId}/0`)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.merchandiseBrands$ = this.http
      .get<IApiResponse<IGroup[]>>(
        `${this.merchandiseUrl}/brands/${this.organizationId}`,
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.merchandiseCategories$ = this.http
      .get<IApiResponse<IGroup[]>>(
        `${this.merchandiseUrl}/categories/${this.organizationId}`,
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.merchandiseDivisions$ = this.http
      .get<IApiResponse<IGroup[]>>(
        `${this.merchandiseUrl}/divisions/${this.organizationId}`,
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.merchandiseTypes$ = this.http
      .get<IApiResponse<IGroup[]>>(`${this.merchandiseUrl}/types`)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.organizationTaxes$ = this.orgTaxesRefreshSubject.pipe(
      switchMap(() =>
        this.http
          .get<IApiResponse<IOrganizationTax[]>>(
            `${this.organizationUrl}/taxes/${this.organizationId}`,
          )
          .pipe(
            map((data) => data?.result ?? []),
            catchError((err) => {
              this.errorHandlerService.handleError(err);
              // Keep merchandise tax grid usable even if lookup fails
              return of([] as IOrganizationTax[]);
            }),
          ),
      ),
      shareReplay(1),
    );

    this.merchandiseWithMovements$ = combineLatest([
      this.merchandiseSelectedAction$,
      this.movementsRefreshSubject,
    ]).pipe(
      switchMap(([merchandiseId]) => {
        if (!merchandiseId || merchandiseId <= 0) {
          return of({
            merchandise: this.emptyMerchandise,
            movements: [],
          });
        }

        return forkJoin({
          merchandise: this.getMerchandise(merchandiseId),
          movements: this.getMerchandiseMovements(merchandiseId),
        });
      }),
      shareReplay(1),
    );

    // optional separated streams for UI binding
    this.merchandiseSelected$ = this.merchandiseWithMovements$.pipe(
      map((x) => x.merchandise),
    );

    this.merchandiseMovements$ = this.merchandiseWithMovements$.pipe(
      map((x) => x.movements),
    );

    this.movementTypes$ = this.http
      .get<IApiResponse<IGroup[]>>(`${this.merchandiseUrl}/movementtypes`)
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.codeTypes$ = this.http
      .get<IApiResponse<IGroup[]>>(`${this.merchandiseUrl}/codetypes`)
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
        shareReplay(1),
      );

    this.merchandiseUom$ = this.merchandiseSelectedAction$.pipe(
      switchMap((merchandiseId) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseUom(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandiseCodes$ = combineLatest([
      this.merchandiseSelectedAction$,
      this.codesRefreshSubject,
    ]).pipe(
      switchMap(([merchandiseId]) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseCodes(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandiseTaxes$ = combineLatest([
      this.merchandiseSelectedAction$,
      this.taxesRefreshSubject,
    ]).pipe(
      switchMap(([merchandiseId]) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseTaxes(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandiseMedia$ = combineLatest([
      this.merchandiseSelectedAction$,
      this.mediaRefreshSubject,
    ]).pipe(
      switchMap(([merchandiseId]) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseMedia(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandiseProfiles$ = combineLatest([
      this.merchandiseSelectedAction$,
      this.profilesRefreshSubject,
    ]).pipe(
      switchMap(([merchandiseId]) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseProfiles(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandisePrices$ = this.merchandiseSelectedAction$.pipe(
      switchMap((merchandiseId) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandisePrices(merchandiseId),
      ),
      shareReplay(1),
    );

    this.merchandiseWithCRUD$ = merge(
      this.merchandises$,
      this.merchandiseModifiedAction$.pipe(
        concatMap((operation) => this.saveMerchandise(operation)),
      ),
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array
            ? [...value]
            : this.modifyMerchandises(acc, value),
        [] as IMerchandise[],
      ),
      shareReplay(1),
    );

    // Merchandise Movements
    //  this.movementsWithCRUD$ = merge(
    //     this.merchandises$,
    //     this.merchandiseModifiedAction$.pipe(
    //       concatMap((operation) => this.saveMerchandise(operation)),
    //     ),
    //   ).pipe(
    //     scan(
    //       (acc, value) =>
    //         value instanceof Array
    //           ? [...value]
    //           : this.modifyMerchandises(acc, value),
    //       [] as IMerchandise[],
    //     ),
    //     shareReplay(1),
    //   );
  }

  addMerchandise(newMerchandise: IMerchandise): void {
    this.merchandiseModifiedSubject.next({
      item: newMerchandise,
      action: 'add',
    });
  }

  deleteMerchandise(selectedMerchandise: IMerchandise): void {
    this.merchandiseModifiedSubject.next({
      item: selectedMerchandise,
      action: 'delete',
    });
  }

  updateMerchandise(selectedMerchandise: IMerchandise): void {
    // Update a copy of the selected Merchandise
    this.merchandiseModifiedSubject.next({
      item: selectedMerchandise,
      action: 'update',
    });
  }

  requestSaveMerchandiseForm(): void {
    this.merchandiseFormActionSubject.next('save');
  }

  requestCancelMerchandiseForm(): void {
    this.merchandiseFormActionSubject.next('cancel');
  }

  saveMerchandise(
    operation: Action<IMerchandise>,
  ): Observable<Action<IMerchandise>> {
    const merchandise: IMerchandise = operation.item;

    if (operation.action === 'delete') {
      const url = `${this.merchandiseUrl}/${merchandise.merchandiseId}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          // Return the original Merchandise so it can be removed from the array
          tap((data) => {
            this.toastService.showMyToast(
              `${merchandise.description}, datos eliminados`,
              toastType.success,
            );
          }),

          map(() => ({ item: merchandise, action: operation.action })),
          catchError((error: HttpErrorResponse) =>
            this.errorHandlerService.handleError(error),
          ),
        );
    }

    if (operation.action === 'add' || operation.action === 'update') {
      const payload: IMerchandise = {
        ...merchandise,
        organizationId: merchandise.organizationId || this.organizationId,
        merchandiseId:
          operation.action === 'add' ? 0 : merchandise.merchandiseId,
      };

      const request$ =
        operation.action === 'add'
          ? this.http.post<IApiResponse<number>>(
              this.merchandiseUrl,
              payload,
              { headers: this.headers },
            )
          : this.http.put<IApiResponse<number>>(
              this.merchandiseUrl,
              payload,
              { headers: this.headers },
            );

      return request$.pipe(
        tap(() => {
          this.toastService.showMyToast(
            `${merchandise.name || merchandise.description}, datos almacenados`,
            toastType.success,
          );
        }),
        map((data) => {
          const savedId = data?.result;
          const nextItem: IMerchandise =
            savedId !== undefined && savedId !== null && savedId > 0
              ? { ...payload, merchandiseId: savedId }
              : payload;

          return { item: nextItem, action: operation.action };
        }),
        catchError(this.errorHandlerService.handleError),
      );
    }

    // If there is no operation, return the merchandise
    return of(operation);
  }

  selectedMerchandiseChanged(selectedMerchandiseId: number): void {
    this.merchandiseSelectedSubject.next(selectedMerchandiseId);
  }

  getMerchandise(id: number): Observable<IMerchandise> {
    return this.http
      .get<
        IApiResponse<IMerchandise>
      >(`${this.merchandiseUrl}/${this.organizationId}/${id}`)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseMovements(id: number): Observable<IMerchandiseMovement[]> {
    return this.http
      .get<
        IApiResponse<IMerchandiseMovement[]>
      >(`${this.merchandiseUrl}/movements/${id}/${this.organizationId}`)
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
      );
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next(this.movementsRefreshSubject.value + 1);
  }

  addMovement(item: IMerchandiseMovement): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.merchandiseUrl}/movement`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento almacenado',
            toastType.success,
          );
          this.refreshMovements();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  updateMovement(item: IMerchandiseMovement): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(`${this.merchandiseUrl}/movement`, item, {
        headers: this.headers,
      })
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento actualizado',
            toastType.success,
          );
          this.refreshMovements();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  deleteMovement(movementId: number, merchandiseId: number): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(
        `${this.merchandiseUrl}/movement/${movementId}/${merchandiseId}`,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Movimiento eliminado',
            toastType.success,
          );
          this.refreshMovements();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseUom(id: number): Observable<IMerchandiseUom[]> {
    return this.http
      .get<
        IApiResponse<IMerchandiseUom[]>
      >(`${this.merchandiseChildGridUrl}/uom/${id}`)
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseCodes(id: number): Observable<IMerchandiseCode[]> {
    return this.http
      .get<
        IApiResponse<IMerchandiseCode[]>
      >(`${this.merchandiseChildGridUrl}/codes/${id}`, {
        params: { organizationId: String(this.organizationId) },
      })
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
      );
  }

  refreshCodes(): void {
    this.codesRefreshSubject.next(this.codesRefreshSubject.value + 1);
  }

  addMerchandiseCode(item: IMerchandiseCode): Observable<number> {
    const payload: IMerchandiseCode = {
      ...item,
      organizationId: item.organizationId ?? this.organizationId,
    };
    return this.http
      .post<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/code`,
        payload,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Código almacenado', toastType.success);
          this.refreshCodes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  updateMerchandiseCode(item: IMerchandiseCode): Observable<number> {
    const payload: IMerchandiseCode = {
      ...item,
      organizationId: item.organizationId ?? this.organizationId,
    };
    return this.http
      .put<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/code`,
        payload,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Código actualizado', toastType.success);
          this.refreshCodes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  deleteMerchandiseCode(item: IMerchandiseCode): Observable<number> {
    const code = encodeURIComponent(item.code ?? '');
    const orgId = item.organizationId ?? this.organizationId;
    return this.http
      .delete<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/code/${item.merchandiseId}/${code}`,
        {
          headers: this.headers,
          params: { organizationId: String(orgId) },
        },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Código eliminado', toastType.success);
          this.refreshCodes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseTaxes(id: number): Observable<IMerchandiseTax[]> {
    return this.http
      .get<IApiResponse<IMerchandiseTax[]>>(
        `${this.merchandiseChildGridUrl}/taxes/${id}`,
        {
          params: { organizationId: String(this.organizationId) },
        },
      )
      .pipe(
        map((data) =>
          (data.result ?? []).map((row) => {
            const anyRow = row as IMerchandiseTax & { Rate?: number | null };
            const raw = anyRow.rate ?? anyRow.Rate;
            const rate = raw == null ? NaN : Number(raw);
            return {
              ...row,
              rate: Number.isFinite(rate) ? rate : null,
            };
          }),
        ),
        catchError(this.errorHandlerService.handleError),
      );
  }

  refreshTaxes(): void {
    this.taxesRefreshSubject.next(this.taxesRefreshSubject.value + 1);
  }

  /** Reloads app_taxes so merchandise tax rates stay in sync with organization. */
  refreshOrganizationTaxes(): void {
    this.orgTaxesRefreshSubject.next(this.orgTaxesRefreshSubject.value + 1);
  }

  addMerchandiseTax(item: IMerchandiseTax): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/tax`,
        item,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto de mercancía almacenado',
            toastType.success,
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  updateMerchandiseTax(item: IMerchandiseTax): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/tax`,
        item,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto de mercancía actualizado',
            toastType.success,
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  deleteMerchandiseTax(item: IMerchandiseTax): Observable<number> {
    const taxType = encodeURIComponent(item.taxType ?? '');
    const rateType = encodeURIComponent(item.rateType ?? '');
    const orgId = item.organizationId ?? this.organizationId;
    return this.http
      .delete<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/tax/${item.merchandiseId}/${taxType}/${rateType}`,
        {
          headers: this.headers,
          params: { organizationId: String(orgId) },
        },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Impuesto de mercancía eliminado',
            toastType.success,
          );
          this.refreshTaxes();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseMedia(id: number): Observable<IMerchandiseMedia[]> {
    return this.http
      .get<IApiResponse<IMerchandiseMedia[]>>(
        `${this.merchandiseChildGridUrl}/media/${id}`,
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of([]);
        }),
      );
  }

  refreshMedia(): void {
    this.mediaRefreshSubject.next(this.mediaRefreshSubject.value + 1);
  }

  addMerchandiseMedia(item: IMerchandiseMedia): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/media`,
        item,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Media almacenada', toastType.success);
          this.refreshMedia();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  updateMerchandiseMedia(item: IMerchandiseMedia): Observable<number> {
    return this.http
      .put<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/media`,
        item,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Media actualizada', toastType.success);
          this.refreshMedia();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  deleteMerchandiseMedia(item: IMerchandiseMedia): Observable<number> {
    const fileName = encodeURIComponent(item.merchandiseFileName ?? '');
    return this.http
      .delete<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/media/${item.merchandiseId}/${fileName}`,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast('Media eliminada', toastType.success);
          this.refreshMedia();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandiseProfiles(id: number): Observable<IMerchandiseProfile[]> {
    return this.http
      .get<IApiResponse<IMerchandiseProfile[]>>(
        `${this.merchandiseChildGridUrl}/profiles/${id}`,
        {
          params: { organizationId: String(this.organizationId) },
        },
      )
      .pipe(
        map((data) =>
          (data.result ?? []).map((row) => ({
            ...row,
            deactivated: !!row.deactivated,
            profileDate: row.profileDate ? new Date(row.profileDate) : null,
          })),
        ),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of([]);
        }),
      );
  }

  refreshProfiles(): void {
    this.profilesRefreshSubject.next(this.profilesRefreshSubject.value + 1);
  }

  addMerchandiseProfile(item: IMerchandiseProfile): Observable<number> {
    const payload: IMerchandiseProfile = {
      ...item,
      organizationId: item.organizationId ?? this.organizationId,
    };
    return this.http
      .post<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/profile`,
        payload,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Expediente almacenado',
            toastType.success,
          );
          this.refreshProfiles();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  updateMerchandiseProfile(item: IMerchandiseProfile): Observable<number> {
    const payload: IMerchandiseProfile = {
      ...item,
      organizationId: item.organizationId ?? this.organizationId,
    };
    return this.http
      .put<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/profile`,
        payload,
        { headers: this.headers },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Expediente actualizado',
            toastType.success,
          );
          this.refreshProfiles();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  deleteMerchandiseProfile(item: IMerchandiseProfile): Observable<number> {
    const orgId = item.organizationId ?? this.organizationId;
    const profileDate =
      item.profileDate instanceof Date
        ? item.profileDate.toISOString().slice(0, 10)
        : String(item.profileDate ?? '');
    return this.http
      .delete<IApiResponse<number>>(
        `${this.merchandiseChildGridUrl}/profile/${item.merchandiseId}`,
        {
          headers: this.headers,
          params: {
            organizationId: String(orgId),
            profileDate,
            description: item.description ?? '',
          },
        },
      )
      .pipe(
        tap(() => {
          this.toastService.showMyToast(
            'Expediente eliminado',
            toastType.success,
          );
          this.refreshProfiles();
        }),
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError),
      );
  }

  getMerchandisePrices(id: number): Observable<IMerchandisePrice[]> {
    return this.http
      .get<
        IApiResponse<IMerchandisePrice[]>
      >(`${this.merchandiseChildGridUrl}/prices/${id}`)
      .pipe(
        map((data) => data.result ?? []),
        catchError(this.errorHandlerService.handleError),
      );
  }
}
