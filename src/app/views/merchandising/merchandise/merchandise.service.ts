import { Injectable, NgZone } from '@angular/core';
import { IMerchandise, IMerchandiseBrand, IMerchandiseCategory } from './merchandise';
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
export class MerchandiseService {
  private merchandiseUrl = environment.API_URL + 'merchandise';
  private emptyMerchandise: Observable<IMerchandise> = of({
    merchandiseId: 0,
    alternCode: '',  
    name: '', 
    description: '', 
    groupId: 0,
    brandId: 0,
    deactivated: false,
    acceptsReturns: false,  
    acceptsReturnsRate: 0.0, 
    currentStock: 0.0,
    availableStock: 0.0, 
    marketShare: 0,  
    regulated: false,  
    merchandiseType: 0, 
    AcceptsRebate: false,  
    height: 0.0,
    width: 0.0, 
    depth: 0.0, 
    createdOn: new Date(),  
    createddBy: '', 
    LastModifiedOn: new Date(),   
    accountId: 0, 
    classId: 0,    
    parentId: 0,  
    organizationId: 0
  }).pipe(take(1));

  private entityId!: number;  
  private organizationId: number = 1; 

  merchandises$!: Observable<IMerchandise[]>;

  merchandiseBrands$!: Observable<IMerchandiseBrand[]>;
  merchandiseCategories$!: Observable<IMerchandiseCategory[]>;

  private merchandiseSelectedSubject = new BehaviorSubject<number>(0);
  merchandiseSelectedAction$ = this.merchandiseSelectedSubject.asObservable();
  merchandiseSelected$!: Observable<IMerchandise>;

  // To Delete
  // private enabledFormSource = new BehaviorSubject<boolean>(false);
  // enableFormAction$ = this.enabledFormSource.asObservable();

  // Action Stream for adding/updating/deleting products
  private merchandiseModifiedSubject = new Subject<Action<IMerchandise>>();
  merchandiseModifiedAction$ = this.merchandiseModifiedSubject.asObservable();

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
    operation: Action<IMerchandise>
  ): IMerchandise[] {
    if (operation.action === 'add') {
      // Return a new array with the added merchandise pushed to it
      return [...merchandises, operation.item];
    } else if (operation.action === 'update') {
      // Return a new array with the updated merchandise replaced
      return merchandises.map((merchandise) =>
        merchandise.merchandiseId === operation.item.merchandiseId
          ? operation.item
          : merchandise
      );
    } else if (operation.action === 'delete') {
      // Filter out the deleted merchandise
      return merchandises.filter(
        (merchandise) =>
          merchandise.merchandiseId !== operation.item.merchandiseId
      );
    }
    return [...merchandises];
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
    // this.emptyMerchandise = of({} as IMerchandise);

    // this.applicationService.entitySelected$.pipe(
    //     tap((data: number) => {
    //       this.entityId =  data;
    //     })
    //   );

      console.log(`${this.merchandiseUrl}/${this.organizationId}/0`)
    this.merchandises$ = this.http
      .get<IApiResponse<IMerchandise[]>>(`${this.merchandiseUrl}/${this.organizationId}/0`)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.merchandiseBrands$ = this.http
      .get<IApiResponse<IMerchandiseBrand[]>>(
        this.merchandiseUrl + `/brands/${this.entityId}/${this.organizationId}`
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.merchandiseCategories$ = this.http
      .get<IApiResponse<IMerchandiseCategory[]>>(
        this.merchandiseUrl + `/categories/${this.entityId}/${this.organizationId}`
      )
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );

    this.merchandiseSelected$ = combineLatest([
      this.merchandises$,
      this.merchandiseSelectedAction$,
    ]).pipe(
      switchMap(([merchandises, selectedMerchandiseId]) => {
        if (selectedMerchandiseId > 0) {
          this.applicationService.entitySelected(selectedMerchandiseId);
          return this.getMerchandise(selectedMerchandiseId);
        } else {
          return this.emptyMerchandise;
        }
      }),
      shareReplay(1)
    );

    this.merchandiseWithCRUD$ = merge(
      this.merchandises$,
      this.merchandiseModifiedAction$.pipe(
        concatMap((operation) => this.saveMerchandise(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array
            ? [...value]
            : this.modifyMerchandises(acc, value),
        [] as IMerchandise[]
      ),
      shareReplay(1)
    );
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

  saveMerchandise(
    operation: Action<IMerchandise>
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
              toastType.success
            );
          }),

          map(() => ({ item: merchandise, action: operation.action })),
          catchError((error: HttpErrorResponse) =>
            this.errorHandlerService.handleError(error)
          )
        );
    }

    if (operation.action === 'add' || operation.action === 'update') {
      return this.http
        .post<IApiResponse<number>>(
          this.merchandiseUrl,
          operation.action === 'add'
            ? { ...merchandise, id: 0 }
            : merchandise,
          {
            headers: this.headers,
          }
        )
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `${merchandise.description}, datos almacenados`,
              toastType.success
            );
          }),
          // Return the original merchandise so it can replace the merchandise in the array
          map(() => ({ item: merchandise, action: operation.action })),
          catchError(this.errorHandlerService.handleError)
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
      .get<IApiResponse<IMerchandise>>(this.merchandiseUrl + '/' + id)
      .pipe(
        map((data) => data.result),
        catchError(this.errorHandlerService.handleError)
      );
  }
}
