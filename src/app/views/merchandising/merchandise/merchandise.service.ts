import { Injectable } from '@angular/core';
import {
  IMerchandise,
  IMerchandisePrice,
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

@Injectable({
  providedIn: 'root',
})
export class MerchandiseService {
  private merchandiseUrl = environment.API_URL + 'merchandise';
  private merchandiseChildGridUrl = environment.API_URL + 'Merchandise';

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

  movements$!: Observable<IMerchandiseMovement[]>;

  private merchandiseSelectedSubject = new BehaviorSubject<number>(0);
  merchandiseSelectedAction$ = this.merchandiseSelectedSubject.asObservable();
  merchandiseWithMovements$!: Observable<IMerchandiseWithMovements>;
  merchandiseSelected$!: Observable<IMerchandise>;
  merchandiseMovements$!: Observable<IMerchandiseMovement[]>;
  merchandiseUom$!: Observable<IMerchandiseUom[]>;
  merchandisePrices$!: Observable<IMerchandisePrice[]>;
  movementTypes$!: Observable<IGroup[]>;

  private movementsRefreshSubject = new BehaviorSubject<number>(0);

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

    this.merchandiseUom$ = this.merchandiseSelectedAction$.pipe(
      switchMap((merchandiseId) =>
        !merchandiseId || merchandiseId <= 0
          ? of([])
          : this.getMerchandiseUom(merchandiseId),
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
      return this.http
        .post<IApiResponse<number>>(
          this.merchandiseUrl,
          operation.action === 'add' ? { ...merchandise, id: 0 } : merchandise,
          {
            headers: this.headers,
          },
        )
        .pipe(
          tap(() => {
            this.toastService.showMyToast(
              `${merchandise.description}, datos almacenados`,
              toastType.success,
            );
          }),
          // Return the original merchandise so it can replace the merchandise in the array
          map((data) => {
            const savedId = data?.result;
            const nextItem: IMerchandise =
              savedId !== undefined && savedId !== null
                ? { ...merchandise, merchandiseId: savedId }
                : merchandise;

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
