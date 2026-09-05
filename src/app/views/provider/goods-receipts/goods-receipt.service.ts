import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, combineLatest, forkJoin, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IOrganizationTax } from '@views/application/organization/organization';
import { IGroup } from '@shared/models/group';
import { IGoodsReceipt, IGoodsReceiptMerchandise, IGoodsReceiptUnit } from './goods-receipt';

@Injectable({
  providedIn: 'root',
})
export class GoodsReceiptService {
  private readonly goodsReceiptUrl = environment.API_URL + 'goodsreceipts';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedGrIdSource = new BehaviorSubject<number>(0);
  private readonly draftOrderSource = new BehaviorSubject<IGoodsReceipt | null>(
    null
  );
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);
  private readonly taxCatalogSource = new BehaviorSubject<IOrganizationTax[]>(
    []
  );
  readonly taxCatalog$ = this.taxCatalogSource.asObservable();
  private readonly merchandiseCatalogSource = new BehaviorSubject<
    IGoodsReceiptMerchandise[]
  >([]);
  readonly merchandises$ = this.merchandiseCatalogSource.asObservable();
  warehouses$!: Observable<IGroup[]>;

  readonly emptyGoodsReceipt: IGoodsReceipt = {
    grId: 0,
    grNumber: '',
    providerId: null,
    providerCode: '',
    providerName: '',
    issueDate: null,
    issueDateTax: null,
    warehouseId: null,
    referenceNumber: '',
    comment: '',
    statusName: '',
    organizationId: 0,
    lines: [],
    taxes: [],
    discounts: [],
  };

  goodsReceipts$!: Observable<IGoodsReceipt[]>;
  selectedGrId$ = this.selectedGrIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  goodsReceiptSelected$!: Observable<IGoodsReceipt>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.warehouses$ = this.applicationService.workingOrganization$.pipe(
      switchMap((org) => {
        const organizationId = org?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IGroup[]);
        }
        return this.http
          .get<IApiResponse<IGroup[]>>(
            `${environment.API_URL}merchandise/warehouses/${organizationId}`
          )
          .pipe(
            map((data) => this.normalizeWarehouses(data.result ?? [])),
            catchError(() =>
              this.http
                .get<IApiResponse<IGroup[]>>(
                  `${environment.API_URL}application/groups/Warehouse/3/${organizationId}`
                )
                .pipe(
                  map((data) => this.normalizeWarehouses(data.result ?? [])),
                  catchError((err) => {
                    this.errorHandlerService.handleError(err);
                    return of([] as IGroup[]);
                  })
                )
            )
          );
      }),
      shareReplay(1)
    );

    this.goodsReceipts$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IGoodsReceipt[]);
            }
            return this.http
              .get<IApiResponse<IGoodsReceipt[]>>(
                `${this.goodsReceiptUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IGoodsReceipt[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.goodsReceiptSelected$ = combineLatest([
      this.selectedGrIdSource,
      this.draftOrderSource,
    ]).pipe(
      switchMap(([grId, draft]) => {
        if (grId <= 0) {
          return of(draft ?? this.createEmptyGoodsReceipt());
        }
        return this.getGoodsReceiptDocument(grId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe((organizationId) => {
        this.draftOrderSource.next(null);
        this.setSelectedGrId(0);
        this.enableForm(false);
        this.loadTaxCatalog(organizationId);
        this.loadMerchandiseCatalog(organizationId);
      });
  }

  taxRateFor(
    taxCode: string | null | undefined,
    issueDate: Date | string | null | undefined
  ): number | null {
    const rateType = this.normalizedRateType(taxCode);
    const issueKey = this.toDateKey(issueDate);
    const rows = this.taxCatalogSource.value.filter((tax) => {
      return this.normalizedRateType(tax.rateType) === rateType;
    });
    const dated = issueKey
      ? rows.filter((tax) => {
          const fromKey = this.toDateKey(tax.taxDateFrom);
          return !!fromKey && fromKey <= issueKey;
        })
      : rows;
    const pool = dated.length ? dated : rows;
    if (!pool.length) {
      return rateType === 'E' ? 0 : null;
    }
    pool.sort(
      (a, b) =>
        this.toDateKey(b.taxDateFrom).localeCompare(this.toDateKey(a.taxDateFrom))
    );
    const rate = Number(pool[0].rate);
    return Number.isFinite(rate) ? rate : rateType === 'E' ? 0 : null;
  }

  isExemptRateType(taxCode: string | null | undefined): boolean {
    const code = (taxCode ?? '').toString().trim().toUpperCase();
    return !code || code === 'E';
  }

  normalizedRateType(taxCode: string | null | undefined): string {
    if (this.isExemptRateType(taxCode)) {
      return 'E';
    }
    return (taxCode ?? '').toString().trim().charAt(0).toUpperCase();
  }

  setSelectedGrId(grId: number): void {
    if ((grId ?? 0) > 0) {
      this.draftOrderSource.next(null);
    }
    this.selectedGrIdSource.next(grId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const grId = this.selectedGrIdSource.value;
    this.enableForm(false);
    if (grId <= 0) {
      this.draftOrderSource.next(null);
      return;
    }
    this.selectedGrIdSource.next(0);
    this.selectedGrIdSource.next(grId);
  }

  beginNewGoodsReceipt(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextGrNumber(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de recepción de mercancías',
            toastType.warning
          );
          return;
        }
        this.draftOrderSource.next({
          ...this.createEmptyGoodsReceipt(),
          grNumber: code,
          statusName: 'Tránsito',
          status: 0,
        });
        this.setSelectedGrId(0);
        this.enableForm(true);
      });
  }

  /**
   * Next GRNumber from app_counters (CounterDescription = Goods Receipt):
   * CONCAT(Module, Counter).
   */
  getNextGrNumber(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.goodsReceiptUrl}/next/${organizationId}`
      )
      .pipe(
        map((data) => {
          const raw = data.result;
          if (typeof raw === 'string') {
            return raw.trim();
          }
          return (raw?.code ?? '').trim();
        }),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of('');
        })
      );
  }

  createEmptyGoodsReceipt(): IGoodsReceipt {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyGoodsReceipt,
      issueDate: today,
      issueDateTax: today,
      warehouseId: null,
      referenceNumber: '',
      statusName: 'Tránsito',
      status: 0,
      organizationId: this.currentOrganizationId,
      lines: [],
      taxes: [],
      discounts: [],
    };
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  saveGoodsReceipt(order: IGoodsReceipt): Observable<number> {
    const request$ =
      (order.grId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.goodsReceiptUrl, order, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.goodsReceiptUrl, order, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            'Recepción de mercancías guardada',
            toastType.success
          );
          this.enableForm(false);
          this.refresh();
          this.selectedGrIdSource.next(0);
          this.selectedGrIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar la recepción de mercancías',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteGoodsReceipt(item: IGoodsReceipt): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.goodsReceiptUrl}/${item.grId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Recepción de mercancías eliminada',
              toastType.success
            );
            this.setSelectedGrId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar la recepción de mercancías',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getGoodsReceiptDocument(grId: number): Observable<IGoodsReceipt> {
    return this.http
      .get<IApiResponse<IGoodsReceipt>>(
        `${this.goodsReceiptUrl}/document/${grId}`
      )
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyGoodsReceipt());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyGoodsReceipt());
        })
      );
  }

  private loadTaxCatalog(organizationId: number): void {
    if (organizationId <= 0) {
      this.taxCatalogSource.next([]);
      return;
    }
    this.http
      .get<IApiResponse<IOrganizationTax[]>>(
        `${environment.API_URL}organization/taxes/${organizationId}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(() => of([] as IOrganizationTax[]))
      )
      .subscribe((rows) => this.taxCatalogSource.next(rows));
  }

  private loadMerchandiseCatalog(organizationId: number): void {
    if (organizationId <= 0) {
      this.merchandiseCatalogSource.next([]);
      return;
    }
    this.http
      .get<IApiResponse<IGoodsReceiptMerchandise[]>>(
        `${environment.API_URL}merchandise/${organizationId}/0`
      )
      .pipe(
        map((data) =>
          (data.result ?? [])
            .map((row) => {
              const anyRow = row as IGoodsReceiptMerchandise & {
                IvaRateType?: string | null;
                UnidadServicio?: string | null;
              };
              return {
                merchandiseId: Number(row.merchandiseId) || 0,
                name: (row.name ?? '').trim(),
                description: (row.description ?? '').trim() || null,
                alternCode: (row.alternCode ?? '').trim() || null,
                ivaRateType: (
                  anyRow.ivaRateType ??
                  anyRow.IvaRateType ??
                  ''
                )
                  .toString()
                  .trim()
                  .charAt(0)
                  .toUpperCase() || null,
                unidadServicio: (
                  anyRow.unidadServicio ??
                  anyRow.UnidadServicio ??
                  ''
                )
                  .toString()
                  .trim() || null,
              };
            })
            .filter((row) => row.merchandiseId > 0)
            .sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
            )
        ),
        catchError(() => of([] as IGoodsReceiptMerchandise[]))
      )
      .subscribe((rows) => this.merchandiseCatalogSource.next(rows));
  }

  getMerchandiseLineDefaults(merchandiseId: number): Observable<{
    units: IGoodsReceiptUnit[];
    unit: string;
    taxCode: string;
    weight: number | null;
  }> {
    const empty = {
      units: [] as IGoodsReceiptUnit[],
      unit: '',
      taxCode: '',
      weight: null as number | null,
    };
    if (merchandiseId <= 0) {
      return of(empty);
    }

    const organizationId = this.currentOrganizationId;
    const catalog = this.merchandiseCatalogSource.value.find(
      (row) => row.merchandiseId === merchandiseId
    );
    const uom$ = this.http
      .get<IApiResponse<Record<string, unknown>[]>>(
        `${environment.API_URL}Merchandise/uom/${merchandiseId}`
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(() => of([] as Record<string, unknown>[]))
      );
    const taxes$ = this.http
      .get<IApiResponse<Record<string, unknown>[]>>(
        `${environment.API_URL}Merchandise/taxes/${merchandiseId}`,
        {
          params: { organizationId: String(organizationId) },
        }
      )
      .pipe(
        map((data) => data.result ?? []),
        catchError(() => of([] as Record<string, unknown>[]))
      );

    return forkJoin({ uom: uom$, taxes: taxes$ }).pipe(
      map(({ uom, taxes }) => {
        const units = this.mapMerchandiseUnits(uom);
        const ivaTax =
          taxes.find((row) =>
            /IVA/i.test(String(row['taxType'] ?? row['TaxType'] ?? ''))
          ) ?? taxes[0];
        const resolvedUnits =
          units.length > 0
            ? units
            : [{ code: 'UND', weight: 0, wholesale: true }];
        const unit =
          resolvedUnits.find((item) => item.wholesale)?.code ||
          resolvedUnits[0]?.code ||
          'UND';
        const selected = resolvedUnits.find((item) => item.code === unit);
        const taxCode = (
          String(
            ivaTax?.['rateType'] ??
              ivaTax?.['RateType'] ??
              catalog?.ivaRateType ??
              'A'
          )
            .trim()
            .charAt(0) || 'A'
        ).toUpperCase();
        return {
          units: resolvedUnits,
          unit,
          taxCode,
          weight: selected?.weight ?? null,
        };
      }),
      catchError(() => of(empty))
    );
  }

  private mapMerchandiseUnits(
    rows: Record<string, unknown>[]
  ): IGoodsReceiptUnit[] {
    const normalized = (rows ?? [])
      .map((row) => ({
        uom: String(row['uom'] ?? row['UOM'] ?? '').trim(),
        uomEquivalent: String(
          row['uomEquivalent'] ?? row['UOMEquivalent'] ?? ''
        ).trim(),
        wholesale: this.isTrue(
          row['wholesale'] ?? row['wholeSale'] ?? row['Wholesale']
        ),
        defaultUnit: this.isTrue(
          row['defaultUnit'] ?? row['DefaultUnit']
        ),
        weight: Number(row['weight'] ?? row['Weight']) || 0,
      }))
      .filter((row) => row.uom);

    const wholesaleRow =
      normalized.find((row) => row.wholesale) ||
      normalized.find((row) => row.defaultUnit) ||
      normalized.find((row) => !row.uomEquivalent) ||
      normalized[0];

    const units: IGoodsReceiptUnit[] = [];
    const add = (code: string, weight: number, wholesale: boolean) => {
      if (!code || units.some((item) => item.code === code)) {
        return;
      }
      units.push({ code, weight, wholesale });
    };

    if (wholesaleRow) {
      add(wholesaleRow.uom, wholesaleRow.weight, true);
    }
    for (const row of normalized) {
      add(row.uom, row.weight, row.wholesale);
      add(row.uomEquivalent, row.weight, false);
    }
    return units;
  }

  private isTrue(value: unknown): boolean {
    if (value === true || value === 1 || value === '1' || value === 'true') {
      return true;
    }
    return typeof value === 'string' && value.length > 0 && value.charCodeAt(0) === 1;
  }

  private toDateKey(value: Date | string | null | undefined): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      const iso = value.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
    }
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
      return '';
    }
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  private normalizeDocument(row: IGoodsReceipt | null | undefined): IGoodsReceipt {
    if (!row) {
      return this.createEmptyGoodsReceipt();
    }
    return {
      ...this.emptyGoodsReceipt,
      ...row,
      grId: Number(row.grId) || 0,
      warehouseId: Number(row.warehouseId) || null,
      lines: row.lines ?? [],
      taxes: row.taxes ?? [],
      discounts: row.discounts ?? [],
    };
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
          anyRow.altern_GroupCode ??
            anyRow['Altern_GroupCode'] ??
            anyRow['altern_groupCode'] ??
            ''
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
