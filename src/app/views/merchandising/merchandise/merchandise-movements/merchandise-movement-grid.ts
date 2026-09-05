import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import { NgForm } from '@angular/forms';
import { catchError, map, Observable, Subject, of, take, takeUntil } from 'rxjs';
import { IMerchandiseMovement } from './merchandisemovement';
import { IMerchandise, IMerchandiseUom } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';
import { OrganizationService } from '@views/application/organization/organization.service';
import { IOrigin } from '@views/application/organization/organization';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { IGroup } from '@shared/models/group';

/** Sales unit for services (Service = 1); they have no UOM catalog. */
const SERVICE_DEFAULT_UOM = 'UND';

/** Selectable UOM: default first, then each equivalent (e.g. CAJ, UND). */
export interface MovementUomOption {
  code: string;
  /** Absolute weight of 1 unit of this code. */
  weight: number;
  /**
   * How many of this unit equal 1 default unit.
   * Default = 1; for UND when 1 CAJ = 12 UND → 12.
   */
  unitsPerDefault: number;
}

@Component({
  selector: 'llion-merchandise-movements',
  templateUrl: './merchandise-movement-grid.html',
  styleUrls: ['./merchandise-movement-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseMovementComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementForm') movementForm?: NgForm;
  @ViewChild('grid') grid?: GridComponent;

  movements$!: Observable<IMerchandiseMovement[]>;
  movementTypes$!: Observable<IGroup[]>;
  warehouses$!: Observable<IGroup[]>;
  origins$!: Observable<IOrigin[]>;
  /** Lot numbers — empty until lot tracking is wired. */
  lots$: Observable<{ lotNumber: string }[]> = of([]);
  selectedMerchandise: IMerchandise | null = null;

  /** Default UOM + equivalents for the dropdown. */
  uomOptions: MovementUomOption[] = [];

  screenMovementsHeight = 320;
  readonly rowHeight = 36;
  readonly headerHeight = 32;
  private readonly tabStripHeight = 42;
  gridEnabled = false;

  @Input() set contentHeight(value: number) {
    if (!value || value <= 0) {
      return;
    }
    this.applyContentHeight(
      Math.max(160, value - this.tabStripHeight - this.headerHeight)
    );
  }

  alignBottomTo(targetBottom: number): void {
    const el = this.grid?.element as HTMLElement | undefined;
    if (!el || !targetBottom) {
      return;
    }

    const top = el.getBoundingClientRect().top;
    if (top <= 0) {
      return;
    }

    const toolbarH =
      (el.querySelector('.e-toolbar') as HTMLElement | null)?.offsetHeight ?? 0;
    const headerH =
      (el.querySelector('.e-gridheader') as HTMLElement | null)?.offsetHeight ??
      this.headerHeight;
    const nextHeight = Math.max(
      160,
      Math.round(targetBottom - top - toolbarH - headerH)
    );
    this.applyContentHeight(nextHeight);
  }

  private applyContentHeight(height: number): void {
    if (this.screenMovementsHeight === height) {
      return;
    }
    this.screenMovementsHeight = height;
    setTimeout(() => {
      if (this.grid) {
        this.grid.height = this.screenMovementsHeight;
        this.grid.refresh();
      }
      this.cdr.markForCheck();
    });
  }

  movementTypeFields: Object = {
    text: 'description',
    value: 'altern_GroupCode',
  };
  warehouseFields: Object = { text: 'description', value: 'groupId' };
  originFields: Object = { text: 'displayText', value: 'origin' };
  uomFields: Object = { text: 'code', value: 'code' };
  lotFields: Object = { text: 'lotNumber', value: 'lotNumber' };

  movementData!: IMerchandiseMovement;
  private uomList: IMerchandiseUom[] = [];
  private previousUomCode = '';
  private loadedMovements: IMerchandiseMovement[] = [];
  private originCodes = new Set<string>();
  /** Last cost we prefilled so an API refresh does not overwrite a user edit. */
  private prefilledUnitCost: number | null = null;

  get merchandiseDisplayName(): string {
    const m = this.selectedMerchandise;
    if (!m) {
      return '';
    }
    return (m.name || m.description || m.alternCode || '').trim();
  }

  toolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Search'],
    'Movimientos'
  );
  editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
  };

  /** Only inventory movements (origin INV) can be edited or deleted. */
  private readonly inventoryOrigin = 'INV';

  private selectedMerchandiseId = 0;
  private organizationId = 1;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private merchandiseService: MerchandiseService,
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.movementData = this.createEmptyMovement();
  }

  ngOnInit(): void {
    this.movements$ = this.merchandiseService.merchandiseMovements$;
    this.movementTypes$ = this.merchandiseService.movementTypes$;
    this.warehouses$ = this.merchandiseService.warehouses$;
    this.origins$ = this.organizationService.origins$.pipe(
      map((rows) =>
        (rows ?? []).map((o) => ({
          ...o,
          displayText: o.originDescription
            ? `${o.origin} - ${o.originDescription}`
            : o.origin,
        }))
      )
    );
    this.organizationId = this.merchandiseService.currentOrganizationId;

    this.origins$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.originCodes = new Set(
        (rows ?? [])
          .map((o) => (o.origin || '').trim().toUpperCase())
          .filter((code) => !!code)
      );
    });

    this.movements$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (rows) => {
        this.loadedMovements = Array.isArray(rows) ? rows : [];
      },
      error: () => {
        this.loadedMovements = [];
      },
    });

    this.merchandiseService.merchandiseUom$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rows) => {
          this.uomList = rows ?? [];
          this.rebuildUomOptions();
          this.applyDefaultUomIfMissing();
          this.cdr.markForCheck();
        },
        error: () => {
          this.uomList = [];
          this.rebuildUomOptions();
          this.cdr.markForCheck();
        },
      });

    this.merchandiseService.merchandiseSelected$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (merchandise) => {
          this.selectedMerchandise = merchandise?.merchandiseId
            ? merchandise
            : null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.selectedMerchandise = null;
          this.cdr.markForCheck();
        },
      });

    this.merchandiseService.merchandiseSelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((merchandiseId) => {
        this.selectedMerchandiseId = merchandiseId ?? 0;
        this.applyEditState(this.selectedMerchandiseId > 0);
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.applyEditState(this.selectedMerchandiseId > 0);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQuantityOrCostChange(): void {
    this.recalculateTotals();
  }

  onUomChange(args: ChangeEventArgs): void {
    const nextCode =
      (args?.itemData as MovementUomOption | undefined)?.code ||
      (typeof args?.value === 'string' ? args.value : '') ||
      this.movementData.uom;

    if (nextCode && this.previousUomCode && nextCode !== this.previousUomCode) {
      this.convertUnitCost(this.previousUomCode, nextCode);
    }

    if (nextCode) {
      this.movementData.uom = nextCode;
      this.previousUomCode = nextCode;
    }
    this.recalculateTotals();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsSelection =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsSelection && this.selectedMerchandiseId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        this.merchandiseService.isServiceCatalog
          ? 'Debe seleccionar un servicio para gestionar movimientos'
          : 'Debe seleccionar una mercancía para gestionar movimientos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseMovement>;
      if (!this.isEditableOrigin(row.origin)) {
        args.cancel = true;
        this.toastService.showMyToast(
          `Solo se pueden editar movimientos con origen ${this.inventoryOrigin}`,
          toastType.warning
        );
        return;
      }
    }

    if (args.requestType === 'delete') {
      const rows = this.asMovementRows(args.data);
      if (rows.some((r) => !this.isEditableOrigin(r.origin))) {
        args.cancel = true;
        this.toastService.showMyToast(
          `Solo se pueden eliminar movimientos con origen ${this.inventoryOrigin}`,
          toastType.warning
        );
        return;
      }
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseMovement>;
      const isAdd = args.requestType === 'add';
      const quantity = row.quantity ?? (isAdd ? 1 : null);
      const totalCost = row.totalCost ?? null;
      const unitCost =
        quantity && quantity > 0 && totalCost != null
          ? Number((totalCost / quantity).toFixed(2))
          : 0;

      this.rebuildUomOptions();
      const defaultUom = this.defaultSalesUnit();

      this.movementData = {
        ...this.createEmptyMovement(),
        ...row,
        merchandiseId: this.selectedMerchandiseId,
        organizationId: this.organizationId,
        movementDate: row.movementDate
          ? new Date(row.movementDate)
          : new Date(),
        block_Date: row.block_Date ? new Date(row.block_Date) : null,
        customer_Provider:
          row.customer_Provider ?? row.customerProviderName ?? null,
        quantity,
        unitCost,
        uom: row.uom || defaultUom,
        warehouseId: row.warehouseId ?? 0,
        lotNumber: row.lotNumber ?? null,
        comment: row.comment ?? null,
        documentNumber: isAdd ? '' : (row.documentNumber ?? ''),
        origin: isAdd
          ? this.inventoryOrigin
          : (row.origin ?? this.inventoryOrigin),
        documentOrigin: isAdd
          ? ''
          : (row.documentOrigin || row.documentNumber || ''),
      };
      this.previousUomCode = this.movementData.uom || '';
      this.prefilledUnitCost = isAdd ? Number(this.movementData.unitCost) || 0 : null;
      this.recalculateTotals();
      this.loadUomOptionsForDialog(isAdd ? '' : (row.uom || ''));

      if (isAdd) {
        this.prefillLastUnitCost();
        this.merchandiseService
          .getNextMovementDocumentNumber()
          .pipe(take(1))
          .subscribe({
            next: (doc) => {
              this.movementData = {
                ...this.movementData,
                documentNumber: doc,
                documentOrigin: doc,
                origin: this.resolveOrigin(this.movementData.origin),
              };
              this.cdr.markForCheck();
            },
          });
      }

      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.movementForm?.valid) {
        this.recalculateTotals();
        const payload: IMerchandiseMovement = this.asInventoryMovementPayload(
          this.movementData
        );

        if (
          payload.movementId &&
          payload.movementId > 0 &&
          !this.isEditableOrigin(this.movementData.origin)
        ) {
          args.cancel = true;
          this.toastService.showMyToast(
            `Solo se pueden editar movimientos con origen ${this.inventoryOrigin}`,
            toastType.warning
          );
          return;
        }

        args.data = payload;

        const request$ =
          payload.movementId && payload.movementId > 0
            ? this.merchandiseService.updateMovement(payload)
            : this.merchandiseService.addMovement(payload);

        request$.pipe(take(1)).subscribe({
          error: () => {
            args.cancel = true;
          },
        });
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const rows = this.asMovementRows(args.data);
      for (const row of rows) {
        if (row.movementId > 0 && row.merchandiseId > 0) {
          this.merchandiseService
            .deleteMovement(row.movementId, row.merchandiseId)
            .pipe(take(1))
            .subscribe({
              error: () => {
                args.cancel = true;
              },
            });
        }
      }
    }
  }

  private isEditableOrigin(origin: string | null | undefined): boolean {
    return (origin || '').trim().toUpperCase() === this.inventoryOrigin;
  }

  /** Origin must exist in app_origin; inventory movements default to INV. */
  private resolveOrigin(origin: string | null | undefined): string {
    const value = (origin || '').trim().toUpperCase();
    if (value && (this.originCodes.size === 0 || this.originCodes.has(value))) {
      return value;
    }
    return this.inventoryOrigin;
  }

  /** Inventory screen: origin from app_origin (INV for now), origin number = movement number. */
  private asInventoryMovementPayload(
    movement: IMerchandiseMovement
  ): IMerchandiseMovement {
    const documentNumber = movement.documentNumber || '';
    const origin = this.resolveOrigin(movement.origin);
    const uom = this.isServiceMerchandise()
      ? SERVICE_DEFAULT_UOM
      : movement.uom || '';
    return {
      ...movement,
      merchandiseId: this.selectedMerchandiseId,
      organizationId: this.organizationId,
      origin,
      documentOrigin: documentNumber,
      uom,
    };
  }

  private asMovementRows(data: unknown): IMerchandiseMovement[] {
    if (Array.isArray(data)) {
      return data as IMerchandiseMovement[];
    }
    if (data && typeof data === 'object') {
      return [data as IMerchandiseMovement];
    }
    return [];
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const dialog = args.dialog as
        | {
            header?: string;
            width?: string | number;
            cssClass?: string;
            element?: HTMLElement;
          }
        | undefined;
      if (dialog) {
        dialog.header = 'Movimiento mercancía';
        dialog.width = 560;
        dialog.cssClass = 'movement-merchandise-dlg';
        dialog.element?.classList.add('movement-merchandise-dlg');
      }

      setTimeout(() => {
        this.applyDefaultUomIfMissing();
        this.cdr.detectChanges();
        const form = args.form as HTMLFormElement | undefined;
        const field = form?.elements.namedItem(
          'movementType'
        ) as HTMLInputElement | null;
        field?.focus();
      });
    }
  }

  /**
   * Builds dropdown as [default UOM, ...equivalents].
   * Example: default CAJ + eq UND → ['CAJ','UND'].
   * Services, or merchandise without UOMs yet, default to UND.
   */
  private rebuildUomOptions(): void {
    if (this.isServiceMerchandise()) {
      this.uomOptions = [this.serviceUomOption()];
      return;
    }

    const rows = this.uomList ?? [];
    const defaultRow =
      rows.find((r) => r.defaultUnit) ||
      rows.find((r) => !(r.uomEquivalent || '').trim()) ||
      rows[0];

    if (!defaultRow?.uom) {
      this.uomOptions = [this.serviceUomOption()];
      return;
    }

    const options: MovementUomOption[] = [
      {
        code: defaultRow.uom,
        weight: Number(defaultRow.weight) || 0,
        unitsPerDefault: 1,
      },
    ];

    for (const row of rows) {
      const eqCode = (row.uomEquivalent || '').trim();
      if (!eqCode) {
        continue;
      }
      const unitsPerDefault = Number(row.equivalence);
      if (!(unitsPerDefault > 0)) {
        continue;
      }
      if (options.some((o) => o.code === eqCode)) {
        continue;
      }
      options.push({
        code: eqCode,
        weight: Number(row.weight) || 0,
        unitsPerDefault,
      });
    }

    this.uomOptions = options;
  }

  private findUomOption(code: string | null | undefined): MovementUomOption | undefined {
    if (!code) {
      return undefined;
    }
    return this.uomOptions.find((o) => o.code === code);
  }

  /** Keep the same value in default units when switching CAJ ↔ UND, etc. */
  private convertUnitCost(fromCode: string, toCode: string): void {
    const from = this.findUomOption(fromCode);
    const to = this.findUomOption(toCode);
    if (!from || !to || from.unitsPerDefault <= 0 || to.unitsPerDefault <= 0) {
      return;
    }
    const current = Number(this.movementData.unitCost) || 0;
    this.movementData.unitCost = this.convertCostValue(current, from, to);
  }

  private convertCostValue(
    unitCost: number,
    from: MovementUomOption,
    to: MovementUomOption
  ): number {
    const costDefault = unitCost * from.unitsPerDefault;
    return Number((costDefault / to.unitsPerDefault).toFixed(4));
  }

  /**
   * Prefill unit cost from the last transaction. The field stays editable.
   * Does not overwrite a value the user already typed.
   */
  private prefillLastUnitCost(): void {
    const local = this.lastCostFromLoadedMovements();
    if (local) {
      this.applyLastUnitCost(local.unitCost, local.uom);
    }

    this.merchandiseService
      .getLastUnitCost(this.selectedMerchandiseId)
      .pipe(take(1))
      .subscribe((last) => {
        if (!last) {
          return;
        }
        const current = Number(this.movementData.unitCost) || 0;
        if (
          this.prefilledUnitCost !== null &&
          current !== this.prefilledUnitCost
        ) {
          return;
        }
        this.applyLastUnitCost(last.unitCost, last.uom);
        this.cdr.markForCheck();
      });
  }

  private lastCostFromLoadedMovements(): { unitCost: number; uom: string } | null {
    const last = this.loadedMovements.find((m) => {
      const qty = Number(m.quantity);
      const cost = Number(m.totalCost);
      return qty !== 0 && Number.isFinite(qty) && cost !== 0 && Number.isFinite(cost);
    });
    if (!last) {
      return null;
    }
    return {
      unitCost: Number((Number(last.totalCost) / Number(last.quantity)).toFixed(4)),
      uom: last.uom || '',
    };
  }

  private applyLastUnitCost(unitCost: number, fromUom: string): void {
    const targetUom = this.movementData.uom || this.uomOptions[0]?.code || fromUom;
    const from = this.findUomOption(fromUom);
    const to = this.findUomOption(targetUom);
    const next =
      from && to && from.unitsPerDefault > 0 && to.unitsPerDefault > 0
        ? this.convertCostValue(unitCost, from, to)
        : Number(unitCost.toFixed(4));
    this.movementData.unitCost = next;
    this.prefilledUnitCost = next;
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    const qty = Number(this.movementData.quantity) || 0;
    const unitCost = Number(this.movementData.unitCost) || 0;
    const option = this.findUomOption(this.movementData.uom);
    const unitWeight = option?.weight ?? 0;

    // Cost and weight are for the selected UOM (already converted via equivalence).
    this.movementData.totalCost = Number((qty * unitCost).toFixed(2));
    this.movementData.weight = Number((qty * unitWeight).toFixed(3));
    this.cdr.markForCheck();
  }

  private applyEditState(enabled: boolean): void {
    this.gridEnabled = enabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete', 'Search'] : ['Search'],
      'Movimientos'
    );
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    setTimeout(() => {
      if (!this.grid?.element) {
        return;
      }
      this.grid.toolbar = this.toolbar;
      this.grid.editSettings = { ...this.editSettings };
      this.grid.element.classList.toggle('disablegrid', !enabled);
      this.cdr.markForCheck();
    });
  }

  private isServiceMerchandise(): boolean {
    return (
      this.merchandiseService?.isServiceCatalog === true ||
      this.selectedMerchandise?.service === true
    );
  }

  private serviceUomOption(): MovementUomOption {
    return { code: SERVICE_DEFAULT_UOM, weight: 0, unitsPerDefault: 1 };
  }

  private defaultSalesUnit(): string {
    return this.uomOptions[0]?.code || SERVICE_DEFAULT_UOM;
  }

  private applyDefaultUomIfMissing(): void {
    const defaultUom = this.defaultSalesUnit();
    const current = (this.movementData?.uom || '').trim();
    const known = this.uomOptions.some((o) => o.code === current);
    if (!current || !known) {
      this.movementData = {
        ...this.movementData,
        uom: defaultUom,
      };
      this.previousUomCode = defaultUom;
    }
  }

  /** First dialog open often happens before GET uom returns — load and bind then. */
  private loadUomOptionsForDialog(preferredUom: string): void {
    if (this.isServiceMerchandise()) {
      this.rebuildUomOptions();
      this.applyDefaultUomIfMissing();
      this.cdr.markForCheck();
      return;
    }

    if (this.selectedMerchandiseId <= 0) {
      return;
    }

    this.merchandiseService
      .getMerchandiseUom(this.selectedMerchandiseId)
      .pipe(
        take(1),
        catchError(() => of([] as IMerchandiseUom[]))
      )
      .subscribe((rows) => {
        this.uomList = rows ?? [];
        this.rebuildUomOptions();
        const preferred = (preferredUom || '').trim();
        this.movementData = {
          ...this.movementData,
          uom:
            (preferred && this.uomOptions.some((o) => o.code === preferred)
              ? preferred
              : this.defaultSalesUnit()),
        };
        this.previousUomCode = this.movementData.uom || '';
        this.recalculateTotals();
        this.cdr.detectChanges();
      });
  }

  private createEmptyMovement(): IMerchandiseMovement {
    return {
      movementId: 0,
      merchandiseId: this.selectedMerchandiseId,
      movementDate: new Date(),
      movementType: '',
      documentNumber: '',
      quantity: 1,
      uom: this.isServiceMerchandise() ? SERVICE_DEFAULT_UOM : '',
      weight: null,
      organizationId: this.organizationId,
      unitCost: 0,
      totalCost: 0,
      totalCostWithDiscount: null,
      origin: this.inventoryOrigin,
      documentOrigin: '',
      customer_Provider: null,
      totalSale: null,
      totalSaleWithDiscount: null,
      salesPersonId: null,
      warehouseId: 0,
      accountID: null,
      classId: null,
      block_Date: null,
      createdBy: '',
      lotNumber: null,
      comment: null,
    };
  }
}
