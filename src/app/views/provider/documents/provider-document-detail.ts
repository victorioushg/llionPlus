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
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ProviderDocumentService } from './provider-document.service';
import {
  IProviderDocument,
  IProviderDocumentDiscount,
  IProviderDocumentLine,
  IProviderDocumentTax,
} from './provider-document';
import { IProviderDocumentKindConfig } from './provider-document-kind';
import { IGroup } from '@shared/models/group';

@Component({
  selector: 'llion-provider-document-detail',
  templateUrl: './provider-document-detail.html',
  styleUrls: ['./provider-document-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProviderDocumentDetailComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('discountsgrid') discountsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('discountForm') discountForm?: NgForm;

  readonly discountsGridHeight = 88;
  readonly footerGridRowHeight = 28;
  config!: IProviderDocumentKindConfig;

  orderForm!: FormGroup;
  order$!: Observable<IProviderDocument>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  warehouses$!: Observable<IGroup[]>;
  merchandises: { merchandiseId: number; name: string }[] = [];
  warehouseFields: Object = { text: 'fullName', value: 'groupId' };
  creditCashFields: Object = { text: 'text', value: 'value' };
  creditCashOptions = [
    { text: 'Crédito', value: 0 },
    { text: 'Contado', value: 1 },
  ];
  lines: IProviderDocumentLine[] = [];
  discounts: IProviderDocumentDiscount[] = [];
  taxes: IProviderDocumentTax[] = [];
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

  lineData: IProviderDocumentLine = this.createEmptyLine();
  discountData: IProviderDocumentDiscount = this.createEmptyDiscount();
  lineMerchDiscPct = 0;
  lineVendorDiscPct = 0;
  lineAcceptancePct = 0;
  discountRatePct = 0;

  private currentDocumentId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private formBuilder: FormBuilder,
    private documentService: ProviderDocumentService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.config = this.documentService.config;
  }

  ngOnInit(): void {
    this.orderForm = this.formBuilder.group({
      documentNumber: [''],
      seriesCode: [''],
      issueDate: [null as Date | null],
      issueDateTax: [null as Date | null],
      dueDate: [null as Date | null],
      statusName: [''],
      providerCode: [''],
      providerName: [''],
      referenceNumber: [''],
      taxControlNumber: [''],
      warehouseId: [null as number | null],
      billNumber: [''],
      creditCash: [0],
      creditTerm: [null as number | null],
      comment: [''],
    });
    this.orderForm.disable({ emitEvent: false });

    this.enabled$ = this.documentService.enableFormAction$;
    this.order$ = this.documentService.documentSelected$;
    this.warehouses$ = this.documentService.warehouses$;
    this.documentService.merchandises$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.merchandises = rows ?? [];
      });
    this.visible$ = combineLatest([this.enabled$, this.order$]).pipe(
      map(([editing, order]) => editing || (order?.documentId ?? 0) > 0)
    );
    this.order$.pipe(takeUntil(this.destroy$)).subscribe((order) => {
      this.patchOrder(order);
      this.cdr.markForCheck();
      setTimeout(() => this.updateLinesHeight());
    });

    this.enabled$.pipe(takeUntil(this.destroy$)).subscribe((enabled) => {
      this.gridEnabled = enabled;
      if (enabled) {
        this.orderForm.enable({ emitEvent: false });
      } else {
        this.orderForm.disable({ emitEvent: false });
      }
      this.applyEditState(enabled);
      this.cdr.markForCheck();
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

  formatRate(rate: number | null | undefined): string {
    return ((Number(rate) || 0) * 100).toFixed(2);
  }

  onLineActionBegin(args: SaveEventArgs): void {
    if (!this.ensureCanEdit(args)) {
      return;
    }
    if (args.requestType === 'add' || args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IProviderDocumentLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.createEmptyLine()
          : { ...this.createEmptyLine(), ...row };
      if (args.requestType === 'add') {
        this.lineData.rowNumber = this.nextNumber(
          this.lines,
          (line) => line.rowNumber
        );
      }
      this.lineMerchDiscPct = this.toPercent(this.lineData.merchandiseDiscount);
      this.lineVendorDiscPct = this.toPercent(this.lineData.vendorDiscount);
      this.lineAcceptancePct = this.toPercent(this.lineData.acceptanceRate);
      this.applyMerchandiseName();
      this.cdr.markForCheck();
    }
    if (args.requestType === 'save') {
      if (!this.lineForm?.valid) {
        args.cancel = true;
        return;
      }
      this.applyMerchandiseName();
      this.lineData.merchandiseDiscount = this.fromPercent(this.lineMerchDiscPct);
      this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
      this.lineData.acceptanceRate = this.fromPercent(this.lineAcceptancePct);
      this.lineData.totalCost = this.computeLineTotal(this.lineData);
      args.data = { ...this.lineData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IProviderDocumentLine>(args.data);
      if (!row?.rowNumber) {
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
    }
  }

  onDiscountActionBegin(args: SaveEventArgs): void {
    if (!this.ensureCanEdit(args)) {
      return;
    }
    if (args.requestType === 'add' || args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IProviderDocumentDiscount>;
      this.discountData =
        args.requestType === 'add'
          ? this.createEmptyDiscount()
          : { ...this.createEmptyDiscount(), ...row };
      if (args.requestType === 'add') {
        this.discountData.discountRowNumber = this.nextNumber(
          this.discounts,
          (item) => item.discountRowNumber
        );
      }
      this.discountRatePct = this.toPercent(this.discountData.discountRate);
      this.cdr.markForCheck();
    }
    if (args.requestType === 'save') {
      if (!this.discountForm?.valid) {
        args.cancel = true;
        return;
      }
      this.discountData.discountRate = this.fromPercent(this.discountRatePct);
      const subtotal = Number(this.discountData.subtotal) || 0;
      const rate = Number(this.discountData.discountRate) || 0;
      if (!this.discountData.totalDiscount && subtotal && rate) {
        this.discountData.totalDiscount = subtotal * rate;
      }
      args.data = { ...this.discountData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IProviderDocumentDiscount>(args.data);
      if (!row?.discountRowNumber) {
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
    }
  }

  private patchOrder(order: IProviderDocument): void {
    this.currentDocumentId = Number(order.documentId) || 0;
    this.lines = [...(order.lines ?? [])];
    this.discounts = [...(order.discounts ?? [])];
    this.taxes = [...(order.taxes ?? [])];
    this.refreshTotals(order);
    this.orderForm.patchValue(
      {
        documentNumber: order.documentNumber ?? '',
        seriesCode: order.seriesCode ?? '',
        issueDate: this.asDate(order.issueDate),
        issueDateTax: this.asDate(order.issueDateTax),
        dueDate: this.asDate(order.dueDate),
        statusName: order.statusName ?? '',
        providerCode: order.providerCode ?? '',
        providerName: order.providerName ?? '',
        referenceNumber: order.referenceNumber ?? '',
        taxControlNumber: order.taxControlNumber ?? '',
        warehouseId: order.warehouseId ?? null,
        billNumber: order.billNumber ?? '',
        creditCash: order.creditCash ? 1 : 0,
        creditTerm: order.creditTerm ?? null,
        comment: order.comment ?? '',
      },
      { emitEvent: false }
    );
  }

  private refreshTotals(order?: IProviderDocument): void {
    this.totalItems = this.lines.length || Number(order?.totalItems) || 0;
    this.totalWeight =
      this.sumBy(this.lines, (line) => line.weight) ||
      Number(order?.totalWeight) ||
      0;
    this.netTotal =
      Number(order?.totalCost) ||
      this.sumBy(this.lines, (line) => line.totalCost);
    this.discountTotal =
      Number(order?.totalDiscounts) ||
      this.sumBy(this.discounts, (item) => item.totalDiscount);
    this.taxTotal =
      Number(order?.totalTaxes) ||
      this.sumBy(this.taxes, (tax) => tax.totalTax);
    this.grandTotal =
      Number(order?.totalDocument) ||
      this.netTotal - this.discountTotal + this.taxTotal;
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
        (this.linesGrid?.dataSource as IProviderDocumentLine[]) ?? this.lines;
      this.lines = [...data];
    } else {
      const data =
        (this.discountsGrid?.dataSource as IProviderDocumentDiscount[]) ??
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

  private createEmptyLine(): IProviderDocumentLine {
    return {
      documentId: this.currentDocumentId,
      rowNumber: 0,
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
      acceptanceRate: 0,
      totalCost: 0,
      billRowTypeName: 'Normal',
    };
  }

  private applyMerchandiseName(): void {
    const merchandiseId = Number(this.lineData.merchandiseId) || 0;
    if (merchandiseId <= 0) {
      return;
    }
    const name = this.merchandises
      .find((row) => row.merchandiseId === merchandiseId)
      ?.name?.trim();
    if (name) {
      this.lineData = {
        ...this.lineData,
        description: name,
      };
    }
  }

  private createEmptyDiscount(): IProviderDocumentDiscount {
    return {
      documentId: this.currentDocumentId,
      discountRowNumber: 0,
      description: '',
      discountRate: 0,
      totalDiscount: 0,
      subtotal: 0,
    };
  }

  private computeLineTotal(line: IProviderDocumentLine): number {
    const quantity = Number(line.quantity) || 0;
    const cost = Number(line.costByUnit) || 0;
    const merch = Number(line.merchandiseDiscount) || 0;
    const vendor = Number(line.vendorDiscount) || 0;
    return quantity * cost * (1 - merch) * (1 - vendor);
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
    const host = document.getElementById('provider-document-lines-grid');
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
