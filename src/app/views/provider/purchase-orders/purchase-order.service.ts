import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IPurchaseOrder } from './purchase-order';

@Injectable({
  providedIn: 'root',
})
export class PurchaseOrderService {
  private readonly purchaseOrderUrl = environment.API_URL + 'purchaseorders';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);

  readonly emptyPurchaseOrder: IPurchaseOrder = {
    poId: 0,
    poNumber: '',
    providerId: null,
    providerName: '',
    issueDate: null,
    organizationId: 0,
  };

  purchaseOrders$!: Observable<IPurchaseOrder[]>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.purchaseOrders$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IPurchaseOrder[]);
            }
            return this.http
              .get<IApiResponse<IPurchaseOrder[]>>(
                `${this.purchaseOrderUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IPurchaseOrder[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  deletePurchaseOrder(item: IPurchaseOrder): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.purchaseOrderUrl}/${item.poId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Orden de compra eliminada',
              toastType.success
            );
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar la orden de compra',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }
}
