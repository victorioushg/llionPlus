import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { IGroup } from '@shared/models/group';
import { ApplicationService } from '@shared/services/applicattionService';
import { AuthenticationService } from '@shared/services/authentication.service';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IMerchandise } from '@views/merchandising/merchandise/merchandise';
import {
  IFormulation,
  IFormulationLine,
  IFormulationOverhead,
  IFormulationResidual,
  IOverheadType,
  IProductLine,
  IProductionMerchandise,
  IProductionNote,
  IProductionOrder,
  IProductionOrderLine,
  IProductionResource,
  IProductionTrackingRow,
  isProductionOrderLocked,
} from './production';

@Injectable({
  providedIn: 'root',
})
export class ProductionService {
  private readonly apiUrl = environment.API_URL + 'production';
  private readonly merchandiseUrl = environment.API_URL + 'merchandise';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedLineId = new BehaviorSubject<number>(0);
  private readonly selectedResourceId = new BehaviorSubject<number>(0);
  private readonly selectedFormulationId = new BehaviorSubject<number>(0);
  private readonly selectedOrderId = new BehaviorSubject<number>(0);
  private readonly draftFormulation = new BehaviorSubject<IFormulation | null>(
    null
  );
  private readonly draftOrder = new BehaviorSubject<IProductionOrder | null>(
    null
  );

  private readonly enabledLineForm = new BehaviorSubject<boolean>(false);
  private readonly enabledResourceForm = new BehaviorSubject<boolean>(false);
  private readonly enabledFormulationForm = new BehaviorSubject<boolean>(false);
  private readonly enabledOrderForm = new BehaviorSubject<boolean>(false);
  private readonly enabledLineGrid = new BehaviorSubject<boolean>(false);
  private readonly enabledResourceGrid = new BehaviorSubject<boolean>(false);

  readonly enableLineForm$ = this.enabledLineForm.asObservable();
  readonly enableResourceForm$ = this.enabledResourceForm.asObservable();
  readonly enableFormulationForm$ = this.enabledFormulationForm.asObservable();
  readonly enableOrderForm$ = this.enabledOrderForm.asObservable();
  readonly enableLineGrid$ = this.enabledLineGrid.asObservable();
  readonly enableResourceGrid$ = this.enabledResourceGrid.asObservable();

  productLines$!: Observable<IProductLine[]>;
  productLineSelected$!: Observable<IProductLine>;
  resources$!: Observable<IProductionResource[]>;
  resourceSelected$!: Observable<IProductionResource>;
  overheadTypes$!: Observable<IOverheadType[]>;
  formulations$!: Observable<IFormulation[]>;
  formulationSelected$!: Observable<IFormulation>;
  productionOrders$!: Observable<IProductionOrder[]>;
  productionOrderSelected$!: Observable<IProductionOrder>;
  tracking$!: Observable<IProductionTrackingRow[]>;
  merchandises$!: Observable<IProductionMerchandise[]>;
  warehouses$!: Observable<IGroup[]>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  get currentUserName(): string {
    return this.authenticationService.currentUser?.username ?? '';
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private authenticationService: AuthenticationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    const org$ = this.applicationService.workingOrganization$.pipe(
      map((org) => org?.organizationId ?? 0),
      distinctUntilChanged()
    );

    this.productLines$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IProductLine>(
          `${this.apiUrl}/lines/${organizationId}/0`,
          organizationId
        )
      ),
      shareReplay(1)
    );

    this.productLineSelected$ = combineLatest([
      this.productLines$,
      this.selectedLineId,
    ]).pipe(
      map(([rows, id]) => {
        if (id <= 0) {
          return this.emptyProductLine();
        }
        return rows.find((row) => row.productLineId === id) ?? this.emptyProductLine();
      }),
      shareReplay(1)
    );

    this.resources$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IProductionResource>(
          `${this.apiUrl}/resources/${organizationId}/0`,
          organizationId
        )
      ),
      shareReplay(1)
    );

    this.resourceSelected$ = combineLatest([
      this.resources$,
      this.selectedResourceId,
    ]).pipe(
      map(([rows, id]) => {
        if (id <= 0) {
          return this.emptyResource();
        }
        return rows.find((row) => row.resourceId === id) ?? this.emptyResource();
      }),
      shareReplay(1)
    );

    this.overheadTypes$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IOverheadType>(
          `${this.apiUrl}/overheads/${organizationId}`,
          organizationId
        )
      ),
      shareReplay(1)
    );

    this.formulations$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IFormulation>(
          `${this.apiUrl}/formulations/${organizationId}/0`,
          organizationId
        ).pipe(
          map((rows) =>
            rows.map((row) => ({
              ...row,
              lines: row.lines ?? [],
              overheads: row.overheads ?? [],
              residuals: row.residuals ?? [],
            }))
          )
        )
      ),
      shareReplay(1)
    );

    this.formulationSelected$ = combineLatest([
      this.selectedFormulationId,
      this.draftFormulation,
      org$,
    ]).pipe(
      switchMap(([id, draft]) => {
        if (id <= 0) {
          return of(draft ?? this.emptyFormulation());
        }
        return this.getFormulationDocument(id);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.productionOrders$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IProductionOrder>(
          `${this.apiUrl}/orders/${organizationId}/0`,
          organizationId
        ).pipe(
          map((rows) =>
            rows.map((row) => ({
              ...row,
              lines: row.lines ?? [],
              requirements: row.requirements ?? [],
              notes: row.notes ?? [],
            }))
          )
        )
      ),
      shareReplay(1)
    );

    this.productionOrderSelected$ = combineLatest([
      this.selectedOrderId,
      this.draftOrder,
    ]).pipe(
      switchMap(([id, draft]) => {
        if (id <= 0) {
          return of(draft ?? this.emptyProductionOrder());
        }
        return this.getProductionOrderDocument(id);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.tracking$ = combineLatest([org$, this.refreshSubject]).pipe(
      switchMap(([organizationId]) =>
        this.getList<IProductionTrackingRow>(
          `${this.apiUrl}/tracking/${organizationId}`,
          organizationId
        )
      ),
      shareReplay(1)
    );

    this.merchandises$ = org$.pipe(
      switchMap((organizationId) => {
        if (organizationId <= 0) {
          return of([] as IProductionMerchandise[]);
        }
        return this.http
          .get<IApiResponse<IMerchandise[]>>(
            `${this.merchandiseUrl}/${organizationId}/0`
          )
          .pipe(
            map((data) =>
              (data.result ?? [])
                .map((row) => ({
                  merchandiseId: Number(row.merchandiseId) || 0,
                  name: (row.name ?? '').trim(),
                  alternCode: (row.alternCode ?? '').trim() || null,
                }))
                .filter((row) => row.merchandiseId > 0)
            ),
            catchError(() => of([] as IProductionMerchandise[]))
          );
      }),
      shareReplay(1)
    );

    this.warehouses$ = org$.pipe(
      switchMap((organizationId) => {
        if (organizationId <= 0) {
          return of([] as IGroup[]);
        }
        return this.http
          .get<IApiResponse<IGroup[]>>(
            `${environment.API_URL}application/groups/Warehouse/3/${organizationId}`
          )
          .pipe(
            map((data) => this.normalizeWarehouses(data.result ?? [])),
            catchError(() => of([] as IGroup[]))
          );
      }),
      shareReplay(1)
    );

    org$.subscribe(() => {
      this.selectedLineId.next(0);
      this.selectedResourceId.next(0);
      this.selectedFormulationId.next(0);
      this.selectedOrderId.next(0);
      this.draftFormulation.next(null);
      this.draftOrder.next(null);
      this.enabledFormulationForm.next(false);
      this.enabledOrderForm.next(false);
      this.enabledLineForm.next(false);
      this.enabledResourceForm.next(false);
    });
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  setSelectedLineId(id: number): void {
    this.selectedLineId.next(id ?? 0);
  }

  setSelectedResourceId(id: number): void {
    this.selectedResourceId.next(id ?? 0);
  }

  setSelectedFormulationId(id: number): void {
    if ((id ?? 0) > 0) {
      this.draftFormulation.next(null);
    }
    this.selectedFormulationId.next(id ?? 0);
  }

  setSelectedOrderId(id: number): void {
    if ((id ?? 0) > 0) {
      this.draftOrder.next(null);
    }
    this.selectedOrderId.next(id ?? 0);
  }

  enableLineForm(enabled: boolean): void {
    this.enabledLineForm.next(enabled);
  }

  enableResourceForm(enabled: boolean): void {
    this.enabledResourceForm.next(enabled);
  }

  enableFormulationForm(enabled: boolean): void {
    this.enabledFormulationForm.next(enabled);
  }

  enableOrderForm(enabled: boolean): void {
    this.enabledOrderForm.next(enabled);
  }

  enableLineGrid(enabled: boolean): void {
    this.enabledLineGrid.next(enabled);
  }

  enableResourceGrid(enabled: boolean): void {
    this.enabledResourceGrid.next(enabled);
  }

  beginNewFormulation(overheads: IOverheadType[]): void {
    this.draftFormulation.next({
      ...this.emptyFormulation(),
      overheads: overheads.map((type) => ({
        formulationOverheadId: 0,
        formulationId: 0,
        overheadTypeId: type.overheadTypeId,
        overheadCode: type.overheadCode,
        description: type.description,
        rate: Number(type.defaultRate) || 0,
        amount: 0,
        organizationId: this.currentOrganizationId,
      })),
    });
    this.setSelectedFormulationId(0);
    this.enableFormulationForm(true);
  }

  beginNewProductionOrder(): void {
    const today = this.startOfDay(new Date());
    const estimated = this.addDays(today, 15);
    this.draftOrder.next({
      ...this.emptyProductionOrder(),
      issueDate: today,
      estimatedEndDate: estimated,
      statusName: 'Por iniciar',
    });
    this.setSelectedOrderId(0);
    this.enableOrderForm(true);
  }

  cancelFormulationEdit(): void {
    const id = this.selectedFormulationId.value;
    this.enableFormulationForm(false);
    if (id <= 0) {
      this.draftFormulation.next(null);
      return;
    }
    this.selectedFormulationId.next(0);
    this.selectedFormulationId.next(id);
  }

  cancelOrderEdit(): void {
    const id = this.selectedOrderId.value;
    this.enableOrderForm(false);
    if (id <= 0) {
      this.draftOrder.next(null);
      return;
    }
    this.selectedOrderId.next(0);
    this.selectedOrderId.next(id);
  }

  saveProductLine(item: IProductLine): void {
    this.saveEntity(
      `${this.apiUrl}/line`,
      { ...item, createdBy: this.currentUserName },
      item.productLineId,
      'Línea guardada',
      () => this.selectedLineId.next(0)
    );
  }

  deleteProductLine(item: IProductLine): void {
    this.http
      .delete<IApiResponse<number>>(`${this.apiUrl}/line/${item.productLineId}`)
      .pipe(catchError(this.errorHandlerService.handleError))
      .subscribe((data) => {
        if ((Number(data?.result) || 0) > 0) {
          this.toastService.showMyToast('Línea eliminada', toastType.success);
          this.selectedLineId.next(0);
          this.refresh();
        }
      });
  }

  saveResource(item: IProductionResource): void {
    this.saveEntity(
      `${this.apiUrl}/resource`,
      { ...item, createdBy: this.currentUserName },
      item.resourceId,
      'Recurso guardado',
      () => this.selectedResourceId.next(0)
    );
  }

  deleteResource(item: IProductionResource): void {
    this.http
      .delete<IApiResponse<number>>(
        `${this.apiUrl}/resource/${item.resourceId}`
      )
      .pipe(catchError(this.errorHandlerService.handleError))
      .subscribe((data) => {
        const result = Number(data?.result) || 0;
        if (result < 0) {
          this.toastService.showMyToast(
            'El recurso está usado en una formulación',
            toastType.warning
          );
          return;
        }
        if (result > 0) {
          this.toastService.showMyToast('Recurso eliminado', toastType.success);
          this.selectedResourceId.next(0);
          this.refresh();
        }
      });
  }

  saveFormulation(item: IFormulation): Observable<number> {
    const payload = {
      ...item,
      createdBy: this.currentUserName,
      deactivated: !!item.deactivated,
    };
    const request$ =
      (item.formulationId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(
            `${this.apiUrl}/formulation`,
            payload,
            { headers: this.headers }
          )
        : this.http.post<IApiResponse<number>>(
            `${this.apiUrl}/formulation`,
            payload,
            { headers: this.headers }
          );

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Formulación guardada',
            toastType.success
          );
          this.enableFormulationForm(false);
          this.refresh();
          this.selectedFormulationId.next(0);
          this.selectedFormulationId.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar la formulación',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => {
        this.errorHandlerService.handleError(err);
        return of(0);
      })
    );
  }

  deleteFormulation(item: IFormulation): void {
    this.http
      .delete<IApiResponse<number>>(
        `${this.apiUrl}/formulation/${item.formulationId}`
      )
      .pipe(catchError(this.errorHandlerService.handleError))
      .subscribe((data) => {
        const result = Number(data?.result) || 0;
        if (result < 0) {
          this.toastService.showMyToast(
            'La formulación está usada en órdenes o como subensamble',
            toastType.warning
          );
          return;
        }
        if (result > 0) {
          this.toastService.showMyToast(
            'Formulación eliminada',
            toastType.success
          );
          this.selectedFormulationId.next(0);
          this.refresh();
        }
      });
  }

  saveProductionOrder(item: IProductionOrder): Observable<number> {
    if ((item.productionOrderId ?? 0) > 0 && isProductionOrderLocked(item)) {
      this.toastService.showMyToast(
        'La orden terminada o anulada no se puede modificar',
        toastType.warning
      );
      return of(0);
    }

    const payload = { ...item, createdBy: this.currentUserName };
    const request$ =
      (item.productionOrderId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(`${this.apiUrl}/order`, payload, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(
            `${this.apiUrl}/order`,
            payload,
            { headers: this.headers }
          );

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Orden de producción guardada',
            toastType.success
          );
          this.enableOrderForm(false);
          this.refresh();
          this.selectedOrderId.next(0);
          this.selectedOrderId.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar la orden de producción',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => {
        this.errorHandlerService.handleError(err);
        return of(0);
      })
    );
  }

  deleteProductionOrder(item: IProductionOrder): void {
    this.http
      .delete<IApiResponse<number>>(
        `${this.apiUrl}/order/${item.productionOrderId}`
      )
      .pipe(catchError(this.errorHandlerService.handleError))
      .subscribe((data) => {
        const result = Number(data?.result) || 0;
        if (result < 0) {
          this.toastService.showMyToast(
            'Solo se pueden eliminar órdenes por iniciar',
            toastType.warning
          );
          return;
        }
        if (result > 0) {
          this.toastService.showMyToast('Orden eliminada', toastType.success);
          this.selectedOrderId.next(0);
          this.refresh();
        }
      });
  }

  startProduction(
    productionOrderId: number,
    productionOrderLineId = 0
  ): Observable<number> {
    const userName = encodeURIComponent(this.currentUserName);
    return this.http
      .post<IApiResponse<number>>(
        `${this.apiUrl}/order/${productionOrderId}/start?productionOrderLineId=${productionOrderLineId}&userName=${userName}`,
        {}
      )
      .pipe(
        tap((data) => {
          if ((Number(data.result) || 0) > 0) {
            this.toastService.showMyToast(
              'Producción iniciada',
              toastType.success
            );
            this.refresh();
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(0);
        })
      );
  }

  deliverProduction(
    productionOrderId: number,
    productionOrderLineId: number,
    quantity: number
  ): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.apiUrl}/order/deliver`, {
        productionOrderId,
        productionOrderLineId,
        quantity,
        createdBy: this.currentUserName,
      })
      .pipe(
        tap((data) => {
          if ((Number(data.result) || 0) > 0) {
            this.toastService.showMyToast('Entrega registrada', toastType.success);
            this.refresh();
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(0);
        })
      );
  }

  addNote(productionOrderId: number, comment: string): Observable<number> {
    return this.http
      .post<IApiResponse<number>>(`${this.apiUrl}/note`, {
        productionOrderId,
        comment,
        userName: this.currentUserName,
        createdBy: this.currentUserName,
        organizationId: this.currentOrganizationId,
      } as IProductionNote)
      .pipe(
        tap((data) => {
          if ((Number(data.result) || 0) > 0) {
            this.toastService.showMyToast('Nota agregada', toastType.success);
            this.refresh();
            const orderId = this.selectedOrderId.value;
            if (orderId === productionOrderId) {
              this.selectedOrderId.next(0);
              this.selectedOrderId.next(orderId);
            }
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(0);
        })
      );
  }

  getLastUnitCost(merchandiseId: number): Observable<number> {
    const organizationId = this.currentOrganizationId;
    if (merchandiseId <= 0 || organizationId <= 0) {
      return of(0);
    }
    return this.http
      .get<IApiResponse<{ unitCost?: number }>>(
        `${this.merchandiseUrl}/lastcost/${merchandiseId}/${organizationId}`
      )
      .pipe(
        map((data) => Number(data.result?.unitCost) || 0),
        catchError(() => of(0))
      );
  }

  emptyProductLine(): IProductLine {
    return {
      productLineId: 0,
      lineCode: '',
      description: '',
      lineKind: 0,
      deactivated: false,
      organizationId: this.currentOrganizationId,
    };
  }

  emptyResource(): IProductionResource {
    return {
      resourceId: 0,
      resourceCode: '',
      name: '',
      resourceType: 1,
      uom: 'HR',
      unitCost: 0,
      availableHours: 0,
      deactivated: false,
      organizationId: this.currentOrganizationId,
    };
  }

  emptyFormulation(): IFormulation {
    return {
      formulationId: 0,
      formulationCode: '',
      name: '',
      description: '',
      uom: 'PZA',
      subtotalCost: 0,
      totalCost: 0,
      deactivated: false,
      organizationId: this.currentOrganizationId,
      lines: [],
      overheads: [],
      residuals: [],
    };
  }

  emptyProductionOrder(): IProductionOrder {
    return {
      productionOrderId: 0,
      orderNumber: '',
      description: '',
      status: 0,
      statusName: 'Por iniciar',
      totalCost: 0,
      organizationId: this.currentOrganizationId,
      lines: [],
      requirements: [],
      notes: [],
    };
  }

  emptyFormulationLine(): IFormulationLine {
    return {
      formulationLineId: 0,
      formulationId: 0,
      rowNumber: 0,
      componentKind: 0,
      description: '',
      quantity: 1,
      uom: 'PZA',
      unitCost: 0,
      amount: 0,
      organizationId: this.currentOrganizationId,
    };
  }

  emptyOrderLine(): IProductionOrderLine {
    return {
      productionOrderLineId: 0,
      productionOrderId: 0,
      rowNumber: 0,
      formulationId: 0,
      quantity: 1,
      uom: 'PZA',
      unitCost: 0,
      amount: 0,
      issuedQuantity: 0,
      pendingQuantity: 1,
      deliveredQuantity: 0,
      organizationId: this.currentOrganizationId,
    };
  }

  emptyResidual(): IFormulationResidual {
    return {
      formulationResidualId: 0,
      formulationId: 0,
      description: '',
      quantity: 0,
      uom: 'PZA',
      costPercent: 0,
      organizationId: this.currentOrganizationId,
    };
  }

  private getFormulationDocument(id: number): Observable<IFormulation> {
    return this.http
      .get<IApiResponse<IFormulation>>(`${this.apiUrl}/formulation/${id}`)
      .pipe(
        map((data) => {
          const row = data.result;
          if (!row) {
            return this.emptyFormulation();
          }
          return {
            ...row,
            lines: row.lines ?? [],
            overheads: row.overheads ?? [],
            residuals: row.residuals ?? [],
          };
        }),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(this.emptyFormulation());
        })
      );
  }

  private getProductionOrderDocument(id: number): Observable<IProductionOrder> {
    return this.http
      .get<IApiResponse<IProductionOrder>>(`${this.apiUrl}/order/${id}`)
      .pipe(
        map((data) => {
          const row = data.result;
          if (!row) {
            return this.emptyProductionOrder();
          }
          return {
            ...row,
            lines: row.lines ?? [],
            requirements: row.requirements ?? [],
            notes: row.notes ?? [],
          };
        }),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of(this.emptyProductionOrder());
        })
      );
  }

  private saveEntity(
    url: string,
    payload: unknown,
    id: number,
    successMessage: string,
    afterSave: () => void
  ): void {
    const request$ =
      id > 0
        ? this.http.put<IApiResponse<number>>(url, payload, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(url, payload, {
            headers: this.headers,
          });

    request$
      .pipe(catchError(this.errorHandlerService.handleError))
      .subscribe((data) => {
        if ((Number(data?.result) || 0) > 0) {
          this.toastService.showMyToast(successMessage, toastType.success);
          afterSave();
          this.refresh();
        }
      });
  }

  private getList<T>(url: string, organizationId: number): Observable<T[]> {
    if (organizationId <= 0) {
      return of([] as T[]);
    }
    return this.http.get<IApiResponse<T[]>>(url).pipe(
      map((data) => data.result ?? []),
      catchError((err) => {
        this.errorHandlerService.handleError(err);
        return of([] as T[]);
      })
    );
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private addDays(value: Date, days: number): Date {
    const next = this.startOfDay(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private normalizeWarehouses(rows: IGroup[]): IGroup[] {
    return (rows ?? []).map((row) => {
      const anyRow = row as IGroup & Record<string, unknown>;
      const description = String(
        anyRow.description ?? anyRow['Description'] ?? ''
      );
      const fullName = String(
        anyRow.fullName ??
          anyRow['FullName'] ??
          anyRow['fullDescription'] ??
          anyRow['FullDescription'] ??
          description
      );
      return {
        ...row,
        groupId: Number(anyRow.groupId ?? anyRow['GroupId'] ?? 0),
        description,
        fullName: fullName || description,
        altern_GroupCode: String(
          anyRow.altern_GroupCode ?? anyRow['Altern_GroupCode'] ?? ''
        ),
        parent_GroupCode: Number(
          anyRow.parent_GroupCode ?? anyRow['Parent_GroupCode'] ?? 0
        ),
        groupModule: String(anyRow.groupModule ?? anyRow['GroupModule'] ?? ''),
        entityId: Number(anyRow.entityId ?? anyRow['EntityId'] ?? 0),
        organizationId: Number(
          anyRow.organizationId ?? anyRow['OrganizationId'] ?? 0
        ),
      };
    });
  }
}
