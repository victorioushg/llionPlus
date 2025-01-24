import { Injectable, NgZone } from '@angular/core';
import { IAddressType, IAddress } from './address';
import { environment } from '@environments/environment';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  concatMap,
  map,
  merge,
  of,
  scan,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { Action } from '@shared/models/edit-action';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private apiUrl = `${environment.API_URL}application/`;

  entityId: number = 0;
  parentRefEntityId!: number;

  address: IAddress = {
    addressId: 0,
    address1: '',
    address2: '',
    addressTypeId: '',
    address3: '',
    city: '',
    county: '',
    state: '',
    country: '',
    postalCode: '',
    displayAddress: '',
    entityId: this.parentRefEntityId,
    organizationId: this.entityId
  };

  addressesByEntityId$!: Observable<IAddress[]>;

  private addressSelectedSource = new BehaviorSubject<IAddress>(this.address);
  addressSelectedAction$ = this.addressSelectedSource.asObservable();
  address$ = this.addressSelectedAction$;
  addressTypes$!: Observable<IAddressType[]>;

  private addressModifiedSubject = new Subject<Action<IAddress>>();
  addressModifiedAction$ = this.addressModifiedSubject.asObservable();
  addressWithCRUD$!: Observable<IAddress[]>;

  headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  modifyAddress(
    addresses: IAddress[],
    operation: Action<IAddress>
  ): IAddress[] {
    operation.item.displayAddress = `${operation.item.address1} ${operation.item.address2}. ${operation.item.city}. ${operation.item.county}. ${operation.item.state}`;
    if (operation.action === 'add') {
      return [...addresses, operation.item];
    } else if (operation.action === 'update') {
      return addresses.map((address) =>
        address.addressId === operation.item.addressId
          ? operation.item
          : address
      );
    } else if (operation.action === 'delete') {
      return addresses.filter(
        (address) => address.addressId !== operation.item.addressId
      );
    }
    return [...addresses];
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
      },
    );

    this.addressesByEntityId$ =
      this.applicationService.entitySelectedAction$.pipe(
        switchMap((selectedEntity) => {
          return this.http
            .get<IApiResponse<IAddress[]>>(
              `${this.apiUrl}addresses/${this.parentRefEntityId}/${selectedEntity}`
            )
            .pipe(
              map((data: IApiResponse) => {
                return data.result as IAddress[];
              })
            );
        })
      );

    this.addressTypes$ = this.http
      .get<IApiResponse<IAddressType[]>>(`${this.apiUrl}addressestypes`)
      .pipe(
        map((data) => data.result),
        catchError(this.handleError)
      );

    this.addressWithCRUD$ = merge(
      this.addressesByEntityId$,
      this.addressModifiedAction$.pipe(
        concatMap((operation) => this.saveAddress(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.modifyAddress(acc, value),
        [] as IAddress[]
      )
    );
  }

  addAddress(newAddress: IAddress): void {
    this.addressModifiedSubject.next({
      item: newAddress,
      action: 'add',
    });
  }

  deleteAddress(selectedAddress: IAddress): void {
    this.addressModifiedSubject.next({
      item: selectedAddress,
      action: 'delete',
    });
  }

  updateAddress(selectedAddress: IAddress): void {
    this.addressModifiedSubject.next({
      item: selectedAddress,
      action: 'update',
    });
  }

  saveAddress(operation: Action<IAddress>): Observable<Action<IAddress>> {
    const address: IAddress = operation.item;
    if (operation.action === 'delete') {
      const url = `${this.apiUrl}address/${address.addressId}`;
      return this.http
        .delete<IApiResponse<number>>(url, { headers: this.headers })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `dirección ${operation.item.displayAddress} eliminada`,
              toastType.success
            );
          }),
          map(() => ({ item: address, action: operation.action })),
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
    }

    if (operation.action === 'add') {
      return this.http
        .post<IApiResponse<number>>(
          `${this.apiUrl}address`,
          { ...address, addressId: 0 },
          { headers: this.headers }
        )
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `dirección ${operation.item.displayAddress} agregada`,
              toastType.success
            );
          }),
          map(() => ({ item: address, action: operation.action })),
          catchError(this.handleError)
        );
    }
    if (operation.action === 'update') {
      return this.http
        .put<IApiResponse<number>>(`${this.apiUrl}address`, address, {
          headers: this.headers,
        })
        .pipe(
          tap((data) => {
            this.toastService.showMyToast(
              `dirección ${operation.item.displayAddress} actualizada`,
              toastType.success
            );
          }),
          map(() => ({ item: address, action: operation.action })),
          catchError(this.handleError)
        );
    }
    return of(operation);
  }

  addressSelected(address: IAddress) {
    this.addressSelectedSource.next(address);
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
