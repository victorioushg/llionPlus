import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import {
  Observable,
  Subject,
  combineLatest,
  fromEvent,
  map,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { PurchaseOrderService } from '../purchase-order.service';
import {
  IPurchaseOrder,
  IPurchaseOrderDiscount,
  IPurchaseOrderLine,
  IPurchaseOrderTax,
} from '../purchase-order';

@Component({
  selector: 'llion-purchase-order-detail',
  templateUrl: './purchase-order-detail.html',
  styleUrls: ['./purchase-order-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PurchaseOrderDetailComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('discountsgrid') discountsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('discountForm') discountForm?: NgForm;

  readonly discountsGridHeight = 88;
  readonly footerGridRowHeight = 28;

  orderForm!: FormGroup;
  order$!: Observable<IPurchaseOrder>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  lines: IPurchaseOrderLine[] = [];
  discounts: IPurchaseOrderDiscount[] = [];
  taxes: IPurchaseOrderTax[] = [];
  totalWeight = 0;
  totalItems = 0;
  netTotal = 0;
  discountTotal = 0;
  taxTotal = 0;
  grandTotal = 0;
  linesHeight = 160;
  gridEnabled = false;

  linesToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete'],
    'Renglones'
  ) as ToolbarItems[];
  discountsToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete'],
    'Descuentos'
  ) as ToolbarItems[];
  taxesToolbar = withToolbarTitle([], 'IVA') as ToolbarItems[];
  linesEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
    showDeleteConfirmDialog: true,
  };
  discountsEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
    showDeleteConfirmDialog: true,
  };

  lineData: IPurchaseOrderLine = this.createEmptyLine();
  discountData: IPurchaseOrderDiscount = this.createEmptyDiscount();
  lineMerchDiscPct = 0;
  lineVendorDiscPct = 0;
  discountRatePct = 0;

  currentPoId = 0;
  private currentOrder: IPurchaseOrder | null = null;
  private saving = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private purchaseOrderService: PurchaseOrderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderForm = this.formBuilder.group({
      poNumber: [''],
      issueDate: [null as Date | null],
      deliveryDate: [null as Date | null],
      statusName: [''],
      providerCode: [''],
      providerName: [''],
      comment: [''],
    });
    this.orderForm.disable({ emitEvent: false });

    this.enabled$ = this.purchaseOrderService.enableFormAction$;
    this.order$ = this.purchaseOrderService.purchaseOrderSelected$;
    this.visible$ = combineLatest([this.enabled$, this.order$]).pipe(
      map(([editing, order]) => editing || (order?.poId ?? 0) > 0)
    );
    this.order$.pipe(takeUntil(this.destroy$)).subscribe((order) => {
      this.patchOrder(order);
      if (this.gridEnabled) {
        this.recalculateDocument();
      }
      this.cdr.markForCheck();
      setTimeout(() => this.updateLinesHeight());
    });

    this.enabled$.pipe(takeUntil(this.destroy$)).subscribe((enabled) => {
      this.gridEnabled = enabled;
      this.applyFormEnabled(enabled);
      this.applyEditState(enabled);
      if (enabled) {
        this.recalculateDocument();
      }
      this.cdr.markForCheck();
    });

    this.purchaseOrderService.taxCatalog$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.gridEnabled) {
          this.recalculateDocument();
          this.cdr.markForCheck();
        }
      });

    this.orderForm
      .get('issueDate')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.gridEnabled) {
          this.recalculateDocument();
          this.cdr.markForCheck();
        }
      });

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateLinesHeight());
  }

  ngAfterViewInit(): void {
    this.applyEditState(this.gridEnabled);
    setTimeout(() => this.updateLinesHeight());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLinesDataBound(): void {
    this.updateLinesHeight();
  }

  onCancelClick(): void {
    this.purchaseOrderService.cancelEdit();
  }

  onAcceptClick(): void {
    if (!this.gridEnabled || this.saving) {
      return;
    }
    this.syncGridRows('lines');
    this.syncGridRows('discounts');

    const form = this.orderForm.getRawValue();
    const isNew = this.currentPoId <= 0;
    const poNumber = String(form.poNumber ?? '').trim();
    if (isNew && !poNumber) {
      this.toastService.showMyToast(
        'Indique el número de la orden de compra',
        toastType.warning
      );
      return;
    }

    this.lines = this.lines.map((line, index) => {
      const amounts = this.computeLineAmounts(line);
      return {
        ...line,
        poId: this.currentPoId,
        poRowNumber: line.poRowNumber || index + 1,
        taxCode: this.normalizedTaxCode(line.taxCode, false),
        totalCost: amounts.totalCost,
        totalDiscount: amounts.totalDiscount,
        totalCostAndDiscounts: amounts.totalCostAndDiscounts,
      };
    });
    this.recalculateDocument();

    const payload: IPurchaseOrder = {
      ...(this.currentOrder ?? this.purchaseOrderService.createEmptyPurchaseOrder()),
      poId: this.currentPoId,
      poNumber: isNew ? poNumber : this.currentOrder?.poNumber ?? poNumber,
      providerId: this.currentOrder?.providerId ?? null,
      providerCode: form.providerCode ?? '',
      providerName: form.providerName ?? '',
      issueDate: form.issueDate,
      deliveryDate: form.deliveryDate,
      comment: form.comment ?? '',
      organizationId:
        this.currentOrder?.organizationId ||
        this.purchaseOrderService.currentOrganizationId,
      lines: this.lines,
      discounts: this.discounts.map((item, index) => ({
        ...item,
        poId: this.currentPoId,
        poDiscountRowNumber: item.poDiscountRowNumber || index + 1,
        totalDiscount: this.round2(Number(item.totalDiscount) || 0),
      })),
      taxes: this.taxes,
    };

    this.saving = true;
    this.purchaseOrderService
      .savePurchaseOrder(payload)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
  }

  formatRate(rate: number | null | undefined): string {
    return ((Number(rate) || 0) * 100).toFixed(2);
  }

  onLineActionBegin(args: SaveEventArgs): void {
    if (!this.ensureCanEdit(args)) {
      return;
    }
    if (args.requestType === 'add' || args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IPurchaseOrderLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.createEmptyLine()
          : { ...this.createEmptyLine(), ...row };
      if (args.requestType === 'add') {
        this.lineData.poRowNumber = this.nextNumber(
          this.lines,
          (line) => line.poRowNumber
        );
      }
      this.lineMerchDiscPct = this.toPercent(this.lineData.merchandiseDiscount);
      this.lineVendorDiscPct = this.toPercent(this.lineData.vendorDiscount);
      this.onLineAmountChange();
    }
    if (args.requestType === 'save') {
      if (!this.lineForm?.valid) {
        args.cancel = true;
        return;
      }
      this.lineData.taxCode =
        (this.lineData.taxCode ?? '').toString().trim().charAt(0).toUpperCase() ||
        null;
      this.lineData.merchandiseDiscount = this.fromPercent(this.lineMerchDiscPct);
      this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
      Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
      args.data = { ...this.lineData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IPurchaseOrderLine>(args.data);
      if (!row?.poRowNumber) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Seleccione un renglón para eliminar',
          toastType.warning
        );
      }
    }
  }

  onLineActionComplete(args: DialogEditEventArgs): void {
    this.setDialogHeader(args, 'Agregar renglón', 'Editar renglón');
    if (args.requestType === 'save' || args.requestType === 'delete') {
      this.syncGridRows('lines');
      this.recalculateDocument();
    }
  }

  onDiscountActionBegin(args: SaveEventArgs): void {
    if (!this.ensureCanEdit(args)) {
      return;
    }
    if (args.requestType === 'add' || args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IPurchaseOrderDiscount>;
      this.discountData =
        args.requestType === 'add'
          ? this.createEmptyDiscount()
          : { ...this.createEmptyDiscount(), ...row };
      if (args.requestType === 'add') {
        this.discountData.poDiscountRowNumber = this.nextNumber(
          this.discounts,
          (item) => item.poDiscountRowNumber
        );
      }
      this.discountRatePct = this.toPercent(this.discountData.discountRate);
      this.previewDiscountRow(this.discountData);
      this.cdr.markForCheck();
    }
    if (args.requestType === 'save') {
      if (!this.discountForm?.valid) {
        args.cancel = true;
        return;
      }
      this.discountData.discountRate = this.fromPercent(this.discountRatePct);
      this.previewDiscountRow(this.discountData);
      args.data = { ...this.discountData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IPurchaseOrderDiscount>(args.data);
      if (!row?.poDiscountRowNumber) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Seleccione un descuento para eliminar',
          toastType.warning
        );
      }
    }
  }

  onDiscountActionComplete(args: DialogEditEventArgs): void {
    this.setDialogHeader(args, 'Agregar descuento', 'Editar descuento');
    if (args.requestType === 'save' || args.requestType === 'delete') {
      this.syncGridRows('discounts');
      this.recalculateDocument();
    }
  }

  onDiscountRateChange(): void {
    this.previewDiscountRow(this.discountData);
    this.cdr.markForCheck();
  }

  private patchOrder(order: IPurchaseOrder): void {
    this.currentPoId = Number(order.poId) || 0;
    this.currentOrder = order;
    this.lines = [...(order.lines ?? [])];
    this.discounts = [...(order.discounts ?? [])];
    this.taxes = [...(order.taxes ?? [])];
    if (this.gridEnabled) {
      this.recalculateDocument();
    } else {
      this.refreshTotals(order);
    }

    this.orderForm.patchValue(
      {
        poNumber: order.poNumber ?? '',
        issueDate: this.asDate(order.issueDate),
        deliveryDate: this.asDate(order.deliveryDate),
        statusName: order.statusName ?? '',
        providerCode: order.providerCode ?? '',
        providerName: order.providerName ?? '',
        comment: order.comment ?? '',
      },
      { emitEvent: false }
    );
    this.applyFormEnabled(this.gridEnabled);
  }

  private recalculateDocument(): void {
    this.recalculateDiscounts();
    this.rebuildTaxes();
  }

  private linesBaseTotal(): number {
    return this.round2(this.sumBy(this.lines, (line) => this.lineBase(line)));
  }

  private lineBase(line: IPurchaseOrderLine): number {
    const computed = this.computeLineAmounts(line).totalCostAndDiscounts;
    const stored = Number(line.totalCostAndDiscounts);
    if (this.gridEnabled) {
      return computed;
    }
    return Number.isFinite(stored) && stored !== 0 ? stored : computed;
  }

  private normalizedTaxCode(
    taxCode: string | null | undefined,
    defaultExempt: boolean
  ): string | null {
    if (this.purchaseOrderService.isExemptRateType(taxCode)) {
      if (defaultExempt) {
        return 'E';
      }
      return (taxCode ?? '').toString().trim() ? 'E' : null;
    }
    return (taxCode ?? '').toString().trim().charAt(0).toUpperCase();
  }

  private recalculateDiscounts(): void {
    const invoiceNet = this.linesBaseTotal();
    let running = invoiceNet;
    this.discounts = [...this.discounts]
      .sort(
        (a, b) =>
          (Number(a.poDiscountRowNumber) || 0) -
          (Number(b.poDiscountRowNumber) || 0)
      )
      .map((item) => {
        const rate = Number(item.discountRate) || 0;
        const totalDiscount = this.round2(running * rate);
        const subtotalPO = this.round2(Math.max(0, running - totalDiscount));
        running = subtotalPO;
        return {
          ...item,
          totalDiscount,
          subtotalPO,
        };
      });
    if (this.discountsGrid) {
      this.discountsGrid.dataSource = this.discounts;
    }
  }

  private previewDiscountRow(row: IPurchaseOrderDiscount): void {
    const base = this.discountBaseBefore(row.poDiscountRowNumber);
    const rate = this.fromPercent(this.discountRatePct);
    row.discountRate = rate;
    row.totalDiscount = this.round2(base * rate);
    row.subtotalPO = this.round2(Math.max(0, base - row.totalDiscount));
  }

  private discountBaseBefore(rowNumber: number): number {
    const invoiceNet = this.linesBaseTotal();
    const previous = [...this.discounts]
      .filter(
        (item) => (Number(item.poDiscountRowNumber) || 0) < (rowNumber || 0)
      )
      .sort(
        (a, b) =>
          (Number(a.poDiscountRowNumber) || 0) -
          (Number(b.poDiscountRowNumber) || 0)
      );
    let running = invoiceNet;
    for (const item of previous) {
      const totalDiscount = this.round2(
        running * (Number(item.discountRate) || 0)
      );
      running = this.round2(Math.max(0, running - totalDiscount));
    }
    return running;
  }

  private lastInvoiceSubtotal(): number {
    if (!this.discounts.length) {
      return this.linesBaseTotal();
    }
    const last = [...this.discounts].sort(
      (a, b) =>
        (Number(a.poDiscountRowNumber) || 0) -
        (Number(b.poDiscountRowNumber) || 0)
    )[this.discounts.length - 1];
    const subtotal = Number(last?.subtotalPO);
    return Number.isFinite(subtotal)
      ? this.round2(subtotal)
      : this.linesBaseTotal();
  }

  private applyInvoiceDiscounts(amount: number): number {
    let running = this.round2(amount);
    const rows = [...this.discounts].sort(
      (a, b) =>
        (Number(a.poDiscountRowNumber) || 0) -
        (Number(b.poDiscountRowNumber) || 0)
    );
    for (const item of rows) {
      const totalDiscount = this.round2(
        running * (Number(item.discountRate) || 0)
      );
      running = this.round2(Math.max(0, running - totalDiscount));
    }
    return running;
  }

  private rebuildTaxes(): void {
    const issueDate =
      this.asDate(this.orderForm?.getRawValue()?.issueDate) ??
      this.asDate(this.currentOrder?.issueDate);
    const bases = new Map<string, number>();
    for (const line of this.lines) {
      const taxCode = this.normalizedTaxCode(line.taxCode, true) ?? 'E';
      const lineTotal = this.round2(this.lineBase(line));
      bases.set(taxCode, this.round2((bases.get(taxCode) ?? 0) + lineTotal));
    }

    if (!bases.size && this.lines.length > 0) {
      bases.set('E', this.linesBaseTotal());
    }

    this.taxes = [...bases.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([taxCode, lineBase]) => {
        const taxBase = this.applyInvoiceDiscounts(lineBase);
        const taxRate =
          this.purchaseOrderService.taxRateFor(taxCode, issueDate) ?? 0;
        return {
          poId: this.currentPoId,
          taxCode,
          taxRate,
          taxBase,
          totalTax: this.round2(taxBase * taxRate),
          taxWithHolding: null,
          withHoldingTaxAmount: 0,
          withHoldingTaxRate: null,
        };
      });
    this.refreshTotals();
  }

  private refreshTotals(order?: IPurchaseOrder): void {
    this.totalItems = this.lines.length;
    this.totalWeight = this.round2(
      this.sumBy(this.lines, (line) => line.weight)
    );
    this.netTotal = this.lastInvoiceSubtotal();
    this.discountTotal = this.round2(
      this.sumBy(this.discounts, (item) => item.totalDiscount)
    );
    this.taxTotal = this.round2(
      this.sumBy(this.taxes, (tax) => tax.totalTax)
    );
    this.grandTotal = this.round2(this.netTotal + this.taxTotal);
  }

  private applyFormEnabled(enabled: boolean): void {
    if (!this.orderForm) {
      return;
    }
    if (enabled) {
      this.orderForm.enable({ emitEvent: false });
      this.orderForm.get('statusName')?.disable({ emitEvent: false });
      this.orderForm.get('poNumber')?.disable({ emitEvent: false });
    } else {
      this.orderForm.disable({ emitEvent: false });
    }
  }

  private round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private applyEditState(enabled: boolean): void {
    this.linesEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
      showDeleteConfirmDialog: true,
    };
    this.discountsEditSettings = { ...this.linesEditSettings };
    if (this.linesGrid) {
      this.linesGrid.editSettings = { ...this.linesEditSettings };
    }
    if (this.discountsGrid) {
      this.discountsGrid.editSettings = { ...this.discountsEditSettings };
    }
  }

  private ensureCanEdit(args: SaveEventArgs): boolean {
    const needsEdit =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';
    if (needsEdit && !this.gridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Active Incluir o Modificar para editar renglones y descuentos',
        toastType.warning
      );
      return false;
    }
    return true;
  }

  private syncGridRows(kind: 'lines' | 'discounts'): void {
    if (kind === 'lines') {
      const data =
        (this.linesGrid?.dataSource as IPurchaseOrderLine[]) ?? this.lines;
      this.lines = [...data];
    } else {
      const data =
        (this.discountsGrid?.dataSource as IPurchaseOrderDiscount[]) ??
        this.discounts;
      this.discounts = [...data];
    }
    this.refreshTotals();
    this.cdr.markForCheck();
  }

  private setDialogHeader(
    args: DialogEditEventArgs,
    addTitle: string,
    editTitle: string
  ): void {
    if (args.requestType !== 'beginEdit' && args.requestType !== 'add') {
      return;
    }
    const dialog = args.dialog as { header?: string } | undefined;
    if (dialog) {
      dialog.header = args.requestType === 'add' ? addTitle : editTitle;
    }
  }

  private createEmptyLine(): IPurchaseOrderLine {
    return {
      poId: this.currentPoId,
      poRowNumber: 0,
      merchandiseId: null,
      itemCode: '',
      description: '',
      taxCode: '',
      quantity: 0,
      unit: '',
      weight: 0,
      costByUnit: 0,
      merchandiseDiscount: 0,
      vendorDiscount: 0,
      totalCost: 0,
      billRowTypeName: 'Normal',
    };
  }

  private createEmptyDiscount(): IPurchaseOrderDiscount {
    return {
      poId: this.currentPoId,
      poDiscountRowNumber: 0,
      description: '',
      discountRate: 0,
      totalDiscount: 0,
      subtotalPO: 0,
    };
  }

  onLineAmountChange(): void {
    this.lineData.merchandiseDiscount = this.fromPercent(this.lineMerchDiscPct);
    this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
    Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
    this.cdr.markForCheck();
  }

  private computeLineAmounts(line: IPurchaseOrderLine): {
    totalCost: number;
    totalDiscount: number;
    totalCostAndDiscounts: number;
  } {
    const quantity = Number(line.quantity) || 0;
    const cost = Number(line.costByUnit) || 0;
    const merchRate = Number(line.merchandiseDiscount) || 0;
    const vendorRate = Number(line.vendorDiscount) || 0;
    const gross = this.round2(quantity * cost);
    const afterMerchandise = this.round2(
      Math.max(0, gross - this.round2(gross * merchRate))
    );
    const totalCostAndDiscounts = this.round2(
      Math.max(0, afterMerchandise - this.round2(afterMerchandise * vendorRate))
    );
    const totalDiscount = this.round2(Math.max(0, gross - totalCostAndDiscounts));
    return {
      totalCost: totalCostAndDiscounts,
      totalDiscount,
      totalCostAndDiscounts,
    };
  }

  private nextNumber<T>(
    items: T[],
    pick: (item: T) => number | null | undefined
  ): number {
    return items.reduce((max, item) => Math.max(max, Number(pick(item)) || 0), 0) + 1;
  }

  private firstRow<T>(data: unknown): T | null {
    if (Array.isArray(data)) {
      return (data[0] as T) ?? null;
    }
    return (data as T) ?? null;
  }

  private toPercent(rate: number | null | undefined): number {
    return (Number(rate) || 0) * 100;
  }

  private fromPercent(percent: number | null | undefined): number {
    return (Number(percent) || 0) / 100;
  }

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private sumBy<T>(
    items: T[],
    pick: (item: T) => number | null | undefined
  ): number {
    return items.reduce((sum, item) => sum + (Number(pick(item)) || 0), 0);
  }

  private updateLinesHeight(): void {
    const host = document.getElementById('purchase-order-lines-grid');
    const wrapper = host?.parentElement;
    if (!host || !wrapper || wrapper.clientHeight <= 0) {
      return;
    }

    const reserved = Array.from(wrapper.children)
      .filter((child) => child !== host)
      .reduce((sum, child) => sum + this.outerHeight(child), 0);
    const hostHeight = Math.max(80, Math.floor(wrapper.clientHeight - reserved));
    const toolbarHeight =
      (host.querySelector('.e-toolbar') as HTMLElement | null)?.offsetHeight ?? 0;
    const height = Math.max(80, hostHeight - toolbarHeight - 50);
    if (height === this.linesHeight && this.linesGrid?.height === height) {
      return;
    }

    this.linesHeight = height;
    if (this.linesGrid) {
      this.linesGrid.height = height;
    }
    this.cdr.markForCheck();
  }

  private outerHeight(el: Element): number {
    if (!(el instanceof HTMLElement)) {
      return 0;
    }
    const style = window.getComputedStyle(el);
    return (
      el.offsetHeight +
      parseFloat(style.marginTop || '0') +
      parseFloat(style.marginBottom || '0')
    );
  }
}
