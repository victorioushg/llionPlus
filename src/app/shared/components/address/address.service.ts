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
  combineLatest,
  concatMap,
  map,
  merge,
  of,
  scan,
  shareReplay,
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

  entityId!: number;
  organizationId!: number;

  address: IAddress = {
    addressId: 0,
    address1: '',
    address2: '',
    addressTypeId: '',
    typeDescription: '',
    address3: '',
    city: '',
    county: '',
    state: '',
    country: '',
    postalCode: '',
    displayAddress: '',
    entityId: 0,
    organizationId: 0,
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

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    this.applicationService.organizationIdSelected$.subscribe((result) => {
      this.organizationId = result;
    });

    this.addressesByEntityId$ = combineLatest([
      this.applicationService.entitySelectedAction$,
      this.applicationService.organizationIdSelectedAction$,
    ]).pipe(
      switchMap(([selectedEntity, organizationId]) => {
        this.organizationId = organizationId ?? 0;
        if (!selectedEntity || !organizationId || organizationId <= 0) {
          return of([] as IAddress[]);
        }
        return this.http
          .get<IApiResponse<IAddress[]>>(
            `${this.apiUrl}addresses/${selectedEntity}/${organizationId}`
          )
          .pipe(
            map((data: IApiResponse) => {
              const rows = (data.result ?? []) as Array<
                IAddress & { TypeDescription?: string; AddressTypeId?: number }
              >;
              return rows.map((row) => ({
                ...row,
                addressId: Number(row.addressId) || 0,
                addressTypeId:
                  row.addressTypeId ?? row.AddressTypeId ?? row.addressTypeId,
                typeDescription:
                  row.typeDescription ?? row.TypeDescription ?? '',
              })) as IAddress[];
            })
          );
      })
    );

    this.addressTypes$ = this.http
      .get<IApiResponse<IAddressType[]>>(`${this.apiUrl}addressestypes`)
      .pipe(
        map((data) => {
          const rows = (data.result ?? []) as Array<
            IAddressType & {
              AddressTypeId?: number;
              TypeDescription?: string;
            }
          >;
          return rows.map((row) => ({
            addressTypeId: row.addressTypeId ?? row.AddressTypeId ?? 0,
            typeDescription: row.typeDescription ?? row.TypeDescription ?? '',
          }));
        }),
        catchError((err) => this.handleError(err)),
        shareReplay(1)
      );

    this.addressWithCRUD$ = merge(
      this.addressesByEntityId$,
      this.addressModifiedAction$.pipe(
        concatMap((operation) => this.persistAddress(operation))
      )
    ).pipe(
      scan(
        (acc, value) =>
          value instanceof Array ? [...value] : this.applyLocalChange(acc, value),
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

  addressSelected(address: IAddress): void {
    this.addressSelectedSource.next(address);
  }

  private applyLocalChange(
    addresses: IAddress[],
    operation: Action<IAddress>
  ): IAddress[] {
    operation.item.displayAddress = `${operation.item.address1} ${operation.item.address2}. ${operation.item.city}. ${operation.item.county}. ${operation.item.state}`;

    if (operation.action === 'add') {
      const withoutZeroDup = addresses.filter(
        (address) =>
          !(
            (!address.addressId || address.addressId === 0) &&
            address.address1 === operation.item.address1 &&
            address.postalCode === operation.item.postalCode
          )
      );
      return [...withoutZeroDup, operation.item];
    }

    if (operation.action === 'update') {
      return addresses.map((address) =>
        address.addressId === operation.item.addressId
          ? operation.item
          : address
      );
    }

    if (operation.action === 'delete') {
      return addresses.filter(
        (address) => address.addressId !== operation.item.addressId
      );
    }

    return [...addresses];
  }

  private persistAddress(
    operation: Action<IAddress>
  ): Observable<Action<IAddress>> {
    const address: IAddress = {
      ...operation.item,
      addressTypeId: Number(operation.item.addressTypeId) || 0,
      addressId: Number(operation.item.addressId) || 0,
    };

    if (operation.action === 'delete') {
      return this.http
        .delete<IApiResponse<number>>(
          `${this.apiUrl}address/${address.addressId}`,
          { headers: this.headers }
        )
        .pipe(
          tap(() => {
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
          tap(() => {
            this.toastService.showMyToast(
              `dirección ${operation.item.displayAddress} agregada`,
              toastType.success
            );
          }),
          map((data) => ({
            item: {
              ...address,
              addressId: Number(data.result) || 0,
            },
            action: operation.action,
          })),
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
    }

    if (operation.action === 'update') {
      return this.http
        .put<IApiResponse<number>>(`${this.apiUrl}address`, address, {
          headers: this.headers,
        })
        .pipe(
          tap(() => {
            this.toastService.showMyToast(
              `dirección ${operation.item.displayAddress} actualizada`,
              toastType.success
            );
          }),
          map((data) => ({
            item: {
              ...address,
              addressId: Number(data.result) || address.addressId,
            },
            action: operation.action,
          })),
          catchError((error: HttpErrorResponse) => this.handleError(error))
        );
    }

    return of(operation);
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
