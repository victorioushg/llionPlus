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
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
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
  shareReplay,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IGroup } from '@shared/models/group';
import { ICustomer } from '../../customer';
import { CustomerService } from '../../customer.service';
import { PurchaseService } from '../../../provider/purchases/purchase.service';
import {
  IPurchaseMerchandise,
  IPurchaseUnit,
} from '../../../provider/purchases/purchase';
import {
  CREDIT_CASH_OPTIONS,
  IPaymentTerm,
  toCreditCash,
} from '../../../provider/provider';
import { ProviderService } from '../../../provider/provider.service';
import { AccountsService } from '@views/accounting/accounts/accounts.service';
import { IAccount } from '@views/accounting/accounts/account';
import { IAccountClass } from '@views/accounting/classes/class';
import { ApplicationService } from '@shared/services/applicattionService';
import { TreasuryService } from '@views/treasury/treasury.service';
import {
  ITreasury,
  TREASURY_TYPE_CASHBOX,
} from '@views/treasury/treasury';
import { InvoiceService } from '../invoice.service';
import { IInvoice, IInvoiceDiscount, IInvoiceLine, IInvoiceTax, ISalesman } from '../invoice';
import {
  dueDateFromCredit,
  headerFromCustomer,
} from '../../sales-document-header';

@Component({
  selector: 'llion-invoice-detail',
  templateUrl: './invoice-detail.html',
  styleUrls: ['./invoice-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class InvoiceDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('discountsgrid') discountsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('discountForm') discountForm?: NgForm;

  readonly discountsGridHeight = 88;
  readonly footerGridRowHeight = 28;

  orderForm!: FormGroup;
  order$!: Observable<IInvoice>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  customers$!: Observable<ICustomer[]>;
  salesmen$!: Observable<ISalesman[]>;
  warehouses$!: Observable<IGroup[]>;
  terms$!: Observable<IPaymentTerm[]>;
  accounts$!: Observable<IAccount[]>;
  classes$!: Observable<IAccountClass[]>;
  treasuries$!: Observable<Array<ITreasury & { group: string }>>;
  warehouseFields = { text: 'fullName', value: 'groupId' };
  termFields = { text: 'termsDescription', value: 'termsId' };
  accountFields = { text: 'fullName', value: 'accountId' };
  classFields = { text: 'fullName', value: 'classId' };
  creditCashFields = { text: 'text', value: 'value' };
  creditCashOptions = CREDIT_CASH_OPTIONS;
  treasuryFields = { text: 'treasuryName', value: 'treasuryId', groupBy: 'group' };
  merchandises$!: Observable<IPurchaseMerchandise[]>;
  customerFields = { text: 'description', value: 'customerId' };
  salesmanFields = { text: 'description', value: 'salesmanId' };
  merchandiseFields = { text: 'name', value: 'merchandiseId' };
  unitFields = { text: 'code', value: 'code' };
  taxCodeFields = { text: 'code', value: 'code' };
  filterType: 'Contains' = 'Contains';
  lineUnitOptions: IPurchaseUnit[] = [];
  taxCodeOptions: { code: string }[] = [];
  lines: IInvoiceLine[] = [];
  discounts: IInvoiceDiscount[] = [];
  taxes: IInvoiceTax[] = [];
  totalWeight = 0;
  totalItems = 0;
  goodsWithoutDiscount = 0;
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

  lineData: IInvoiceLine = this.createEmptyLine();
  discountData: IInvoiceDiscount = this.createEmptyDiscount();
  lineMerchDiscPct = 0;
  lineCustomerDiscPct = 0;
  lineOfferDiscPct = 0;
  discountRatePct = 0;

  currentInvoiceId = 0;
  private currentOrder: IInvoice | null = null;
  private customers: ICustomer[] = [];
  private terms: IPaymentTerm[] = [];
  private merchandises: IPurchaseMerchandise[] = [];
  private taxCatalogRows: { taxType?: string; description?: string; rateType?: string }[] =
    [];
  private lastLineMerchandiseId = 0;
  private readonly merchandisePick$ = new Subject<number>();
  private saving = false;
  private readonly destroy$ = new Subject<void>();

  get customerDropdownEnabled(): boolean {
    return this.gridEnabled && this.currentInvoiceId <= 0;
  }

  get isCashSale(): boolean {
    return toCreditCash(this.orderForm?.getRawValue()?.creditCash) === 1;
  }

  constructor(
    private formBuilder: FormBuilder,
    private invoiceService: InvoiceService,
    private customerService: CustomerService,
    private purchaseService: PurchaseService,
    private providerService: ProviderService,
    private accountsService: AccountsService,
    private treasuryService: TreasuryService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderForm = this.formBuilder.group({
      invoiceNumber: [''],
      invoiceSeriesCode: [''],
      issueDate: [null as Date | null],
      dueDate: [null as Date | null],
      statusName: [''],
      customerId: [null as number | null],
      salesmanId: [null as number | null],
      billingPrice: [''],
      creditCash: [0],
      creditTerm: [null as number | null],
      accountId: [null as number | null],
      classId: [null as number | null],
      warehouseId: [null as number | null],
      paymentTreasuryId: [null as number | null],
      paymentDocument: [''],
      comment: [''],
      reference: [''],
    });
    this.orderForm.disable({ emitEvent: false });

    this.enabled$ = this.invoiceService.enableFormAction$;
    this.order$ = this.invoiceService.invoiceSelected$;
    this.salesmen$ = this.customerService.salesmen$;
    this.warehouses$ = this.purchaseService.warehouses$;
    this.terms$ = this.providerService.terms$;
    this.terms$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.terms = rows ?? [];
      this.cdr.markForCheck();
    });
    this.accounts$ = this.accountsService.accounts$;
    this.classes$ = this.accountsService.classes$;
    this.treasuries$ = this.applicationService.workingOrganization$.pipe(
      switchMap((org) =>
        this.treasuryService.getOrganizationTreasuries(org?.organizationId ?? 0)
      ),
      map((rows) =>
        (rows ?? []).map((row) => ({
          ...row,
          group:
            (row.treasuryType ?? '').toUpperCase() === TREASURY_TYPE_CASHBOX
              ? 'Cajas'
              : 'Bancos',
        }))
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.customers$ = this.customerService.customers$.pipe(
      map((rows) =>
        [...(rows ?? [])]
          .map((row) => ({
            ...row,
            customerId: Number(row.customerId) || 0,
          }))
          .filter((row) => row.customerId > 0)
          .sort((a, b) =>
            (a.description ?? '').localeCompare(b.description ?? '', 'es', {
              sensitivity: 'base',
            })
          )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.customers$.pipe(takeUntil(this.destroy$)).subscribe((rows: ICustomer[]) => {
      this.customers = rows;
      this.cdr.markForCheck();
    });
    this.merchandises$ = this.purchaseService.merchandises$;
    this.merchandises$.pipe(takeUntil(this.destroy$)).subscribe((rows: IPurchaseMerchandise[]) => {
      this.merchandises = rows;
      this.cdr.markForCheck();
    });
    this.purchaseService.taxCatalog$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.taxCatalogRows = rows ?? [];
        this.taxCodeOptions = this.buildTaxCodeOptions(this.taxCatalogRows);
        this.cdr.markForCheck();
      });
    this.merchandisePick$
      .pipe(
        switchMap((merchandiseId) =>
          this.purchaseService.getMerchandiseLineDefaults(merchandiseId)
        ),
        takeUntil(this.destroy$)
      )
      .subscribe((defaults) => {
        this.applyLineUnitDefaults(defaults);
      });
    this.visible$ = combineLatest([this.enabled$, this.order$]).pipe(
      map(([editing, order]) => editing || (order?.invoiceId ?? 0) > 0)
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

    this.purchaseService.taxCatalog$
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
    this.invoiceService.cancelEdit();
  }

  onCustomerChange(args?: ChangeEventArgs): void {
    if (!this.gridEnabled) {
      return;
    }
    const customerId =
      Number(args?.value) || Number(this.orderForm.getRawValue().customerId) || 0;
    const customer = this.customers.find((row) => row.customerId === customerId);
    this.orderForm.patchValue(headerFromCustomer(customer), { emitEvent: false });
    this.applyDueDateFromCreditTerm();
    this.cdr.markForCheck();
  }

  onIssueDateChange(): void {
    this.applyDueDateFromCreditTerm();
    this.cdr.markForCheck();
  }

  onCreditCashChange(): void {
    if (!this.gridEnabled) {
      return;
    }
    this.applyDueDateFromCreditTerm();
    this.cdr.markForCheck();
  }

  onCreditTermChange(): void {
    if (!this.gridEnabled) {
      return;
    }
    this.applyDueDateFromCreditTerm();
    this.cdr.markForCheck();
  }

  private applyDueDateFromCreditTerm(): void {
    const form = this.orderForm.getRawValue();
    this.orderForm.patchValue(
      {
        dueDate: dueDateFromCredit(
          this.asDate(form.issueDate),
          form.creditCash,
          Number(form.creditTerm) || 0,
          this.terms
        ),
      },
      { emitEvent: false }
    );
  }

  onAcceptClick(): void {
    if (!this.gridEnabled || this.saving) {
      return;
    }
    this.syncGridRows('lines');
    this.syncGridRows('discounts');

    const form = this.orderForm.getRawValue();
    const isNew = this.currentInvoiceId <= 0;
    const invoiceNumber = String(form.invoiceNumber ?? '').trim();
    if (isNew && !invoiceNumber) {
      this.toastService.showMyToast(
        'Indique el número del factura',
        toastType.warning
      );
      return;
    }

    const customerId = Number(form.customerId) || 0;
    if (customerId <= 0) {
      this.toastService.showMyToast('Seleccione un cliente', toastType.warning);
      return;
    }

    const warehouseId = Number(form.warehouseId) || 0;
    if (warehouseId <= 0) {
      this.toastService.showMyToast('Seleccione el almacén', toastType.warning);
      return;
    }

    const creditCash = toCreditCash(form.creditCash);
    const paymentTreasuryId = Number(form.paymentTreasuryId) || 0;
    if (creditCash === 1 && paymentTreasuryId <= 0) {
      this.toastService.showMyToast(
        'Seleccione la caja o el banco',
        toastType.warning
      );
      return;
    }

    this.lines = this.lines.map((line, index) => {
      const amounts = this.computeLineAmounts(line);
      return {
        ...line,
        invoiceId: this.currentInvoiceId,
        invoiceRowNumber: line.invoiceRowNumber || index + 1,
        taxCode: this.normalizedTaxCode(line.taxCode, false),
        totalPrice: amounts.totalPrice,
        totalDiscount: amounts.totalDiscount,
        totalPriceAndDiscounts: amounts.totalPriceAndDiscounts,
      };
    });
    this.recalculateDocument();

    const customer = this.customers.find((row) => row.customerId === customerId);
    const payload: IInvoice = {
      ...(this.currentOrder ?? this.invoiceService.createEmptyInvoice()),
      invoiceId: this.currentInvoiceId,
      invoiceNumber: isNew
        ? invoiceNumber
        : this.currentOrder?.invoiceNumber ?? invoiceNumber,
      customerId,
      customerCode: customer?.alternCode ?? this.currentOrder?.customerCode ?? '',
      customerName:
        customer?.description ?? this.currentOrder?.customerName ?? '',
      billingPrice: form.billingPrice ?? customer?.billingPrice ?? '',
      issueDate: form.issueDate,
      dueDate: form.dueDate ?? form.issueDate,
      salesmanId: Number(form.salesmanId) || null,
      invoiceSeriesCode: form.invoiceSeriesCode ?? '',
      creditCash,
      creditTerm: Number(form.creditTerm) || null,
      accountId: Number(form.accountId) || null,
      classId: Number(form.classId) || null,
      warehouseId,
      paymentTreasuryId: creditCash === 1 ? paymentTreasuryId : null,
      paymentDocument: form.paymentDocument ?? '',
      updateInventory: 1,
      reference: form.reference ?? '',
      comment: form.comment ?? '',
      status: isNew ? 0 : this.currentOrder?.status ?? 0,
      statusName: isNew
        ? 'Pendiente'
        : this.currentOrder?.statusName ?? form.statusName ?? '',
      organizationId:
        this.currentOrder?.organizationId ||
        this.invoiceService.currentOrganizationId,
      lines: this.lines,
      discounts: this.discounts.map((item, index) => ({
        ...item,
        invoiceId: this.currentInvoiceId,
        invoiceDiscountRowNumber: item.invoiceDiscountRowNumber || index + 1,
        totalDiscount: this.round2(Number(item.totalDiscount) || 0),
      })),
      taxes: this.taxes,
    };

    this.saving = true;
    this.invoiceService
      .saveInvoice(payload)
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
      const row = (args.rowData ?? {}) as Partial<IInvoiceLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.createEmptyLine()
          : { ...this.createEmptyLine(), ...row };
      if (args.requestType === 'add') {
        this.lineData.invoiceRowNumber = this.nextNumber(
          this.lines,
          (line) => line.invoiceRowNumber
        );
      }
      this.lineMerchDiscPct = this.toPercent(this.lineData.merchandiseDiscount);
      this.lineCustomerDiscPct = this.toPercent(this.lineData.customerDiscount);
      this.lineOfferDiscPct = this.toPercent(this.lineData.priceOfferDiscount);
      this.lastLineMerchandiseId = Number(this.lineData.merchandiseId) || 0;
      if (this.lastLineMerchandiseId > 0) {
        this.seedDefaultLineUnit();
        this.applyMerchandiseToLine();
        this.merchandisePick$.next(this.lastLineMerchandiseId);
      } else {
        this.lineUnitOptions = [];
        this.applyMerchandiseToLine();
      }
      this.onLineAmountChange();
      this.taxCodeOptions = this.buildTaxCodeOptions(this.taxCatalogRows);
    }
    if (args.requestType === 'save') {
      if (!this.lineForm?.valid) {
        args.cancel = true;
        return;
      }
      this.applyMerchandiseToLine();
      if (!(Number(this.lineData.merchandiseId) > 0)) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Seleccione una mercancía',
          toastType.warning
        );
        return;
      }
      this.lineData.taxCode =
        (this.lineData.taxCode ?? '').toString().trim().charAt(0).toUpperCase() ||
        null;
      this.lineData.merchandiseDiscount = this.fromPercent(this.lineMerchDiscPct);
      this.lineData.customerDiscount = this.fromPercent(this.lineCustomerDiscPct);
      this.lineData.priceOfferDiscount = this.fromPercent(this.lineOfferDiscPct);
      Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
      args.data = { ...this.lineData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IInvoiceLine>(args.data);
      if (!row?.invoiceRowNumber) {
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
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      setTimeout(() => this.cdr.detectChanges());
    }
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
      const row = (args.rowData ?? {}) as Partial<IInvoiceDiscount>;
      this.discountData =
        args.requestType === 'add'
          ? this.createEmptyDiscount()
          : { ...this.createEmptyDiscount(), ...row };
      if (args.requestType === 'add') {
        this.discountData.invoiceDiscountRowNumber = this.nextNumber(
          this.discounts,
          (item) => item.invoiceDiscountRowNumber
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
      const row = this.firstRow<IInvoiceDiscount>(args.data);
      if (!row?.invoiceDiscountRowNumber) {
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

  private patchOrder(order: IInvoice): void {
    this.currentInvoiceId = Number(order.invoiceId) || 0;
    this.currentOrder = order;
    this.lines = [...(order.lines ?? [])];
    this.discounts = [...(order.discounts ?? [])];
    this.taxes = [...(order.taxes ?? [])];
    if (this.gridEnabled) {
      this.recalculateDocument();
    } else {
      this.refreshTotals(order);
    }

    const issueDate = this.asDate(order.issueDate);
    this.orderForm.patchValue(
      {
        invoiceNumber: order.invoiceNumber ?? '',
        invoiceSeriesCode: order.invoiceSeriesCode ?? '',
        issueDate,
        dueDate: this.asDate(order.dueDate) ?? issueDate,
        statusName:
          order.statusName ?? (this.currentInvoiceId <= 0 ? 'Pendiente' : ''),
        customerId:
          Number(order.customerId) > 0 ? Number(order.customerId) : null,
        salesmanId:
          Number(order.salesmanId) > 0 ? Number(order.salesmanId) : null,
        billingPrice: order.billingPrice ?? '',
        creditCash: toCreditCash(order.creditCash),
        creditTerm: Number(order.creditTerm) > 0 ? Number(order.creditTerm) : null,
        accountId: Number(order.accountId) > 0 ? Number(order.accountId) : null,
        classId: Number(order.classId) > 0 ? Number(order.classId) : null,
        warehouseId: Number(order.warehouseId) > 0 ? Number(order.warehouseId) : null,
        paymentTreasuryId:
          Number(order.paymentTreasuryId) > 0
            ? Number(order.paymentTreasuryId)
            : null,
        paymentDocument: order.paymentDocument ?? '',
        reference: order.reference ?? '',
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

  private lineBase(line: IInvoiceLine): number {
    const computed = this.computeLineAmounts(line).totalPriceAndDiscounts;
    const stored = Number(line.totalPriceAndDiscounts);
    if (this.gridEnabled) {
      return computed;
    }
    return Number.isFinite(stored) && stored !== 0 ? stored : computed;
  }

  private normalizedTaxCode(
    taxCode: string | null | undefined,
    defaultExempt: boolean
  ): string | null {
    if (this.purchaseService.isExemptRateType(taxCode)) {
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
          (Number(a.invoiceDiscountRowNumber) || 0) -
          (Number(b.invoiceDiscountRowNumber) || 0)
      )
      .map((item) => {
        const rate = Number(item.discountRate) || 0;
        const totalDiscount = this.round2(running * rate);
        const subtotalInvoice = this.round2(Math.max(0, running - totalDiscount));
        running = subtotalInvoice;
        return {
          ...item,
          totalDiscount,
          subtotalInvoice,
        };
      });
    if (this.discountsGrid) {
      this.discountsGrid.dataSource = this.discounts;
    }
  }

  private previewDiscountRow(row: IInvoiceDiscount): void {
    const base = this.discountBaseBefore(row.invoiceDiscountRowNumber);
    const rate = this.fromPercent(this.discountRatePct);
    row.discountRate = rate;
    row.totalDiscount = this.round2(base * rate);
    row.subtotalInvoice = this.round2(Math.max(0, base - row.totalDiscount));
  }

  private discountBaseBefore(rowNumber: number): number {
    const invoiceNet = this.linesBaseTotal();
    const previous = [...this.discounts]
      .filter(
        (item) => (Number(item.invoiceDiscountRowNumber) || 0) < (rowNumber || 0)
      )
      .sort(
        (a, b) =>
          (Number(a.invoiceDiscountRowNumber) || 0) -
          (Number(b.invoiceDiscountRowNumber) || 0)
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
        (Number(a.invoiceDiscountRowNumber) || 0) -
        (Number(b.invoiceDiscountRowNumber) || 0)
    )[this.discounts.length - 1];
    const subtotal = Number(last?.subtotalInvoice);
    return Number.isFinite(subtotal)
      ? this.round2(subtotal)
      : this.linesBaseTotal();
  }

  private applyInvoiceDiscounts(amount: number): number {
    let running = this.round2(amount);
    const rows = [...this.discounts].sort(
      (a, b) =>
        (Number(a.invoiceDiscountRowNumber) || 0) -
        (Number(b.invoiceDiscountRowNumber) || 0)
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
    const taxDate =
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
        const taxRate = this.purchaseService.taxRateFor(taxCode, taxDate) ?? 0;
        return {
          invoiceId: this.currentInvoiceId,
          taxCode,
          taxRate,
          taxBase,
          totalTax: this.round2(taxBase * taxRate),
        };
      });
    this.refreshTotals();
  }

  private refreshTotals(order?: IInvoice): void {
    this.totalItems = this.lines.length;
    this.totalWeight = this.round2(
      this.sumBy(this.lines, (line) => line.weight)
    );
    this.goodsWithoutDiscount = this.round2(
      this.sumBy(this.lines, (line) =>
        this.round2((Number(line.quantity) || 0) * (Number(line.priceByUnit) || 0))
      )
    );
    this.netTotal = this.lastInvoiceSubtotal();
    this.discountTotal = this.round2(
      this.sumBy(this.discounts, (item) => item.totalDiscount)
    );
    this.taxTotal = this.round2(this.sumBy(this.taxes, (tax) => tax.totalTax));
    this.grandTotal = this.round2(this.netTotal + this.taxTotal);
    if (order && !this.gridEnabled) {
      this.netTotal = this.round2(Number(order.totalPrice) || this.netTotal);
      this.discountTotal = this.round2(
        Number(order.totalDiscounts) || this.discountTotal
      );
      this.taxTotal = this.round2(Number(order.totalTaxes) || this.taxTotal);
      this.grandTotal = this.round2(Number(order.totalInvoice) || this.grandTotal);
    }
  }

  private applyFormEnabled(enabled: boolean): void {
    if (!this.orderForm) {
      return;
    }
    this.orderForm.disable({ emitEvent: false });
    if (!enabled) {
      return;
    }
    this.orderForm.get('issueDate')?.enable({ emitEvent: false });
    this.orderForm.get('salesmanId')?.enable({ emitEvent: false });
    this.orderForm.get('comment')?.enable({ emitEvent: false });
    this.orderForm.get('warehouseId')?.enable({ emitEvent: false });
    this.orderForm.get('reference')?.enable({ emitEvent: false });
    this.orderForm.get('creditCash')?.enable({ emitEvent: false });
    this.orderForm.get('creditTerm')?.enable({ emitEvent: false });
    this.orderForm.get('accountId')?.enable({ emitEvent: false });
    this.orderForm.get('classId')?.enable({ emitEvent: false });
    this.orderForm.get('invoiceSeriesCode')?.enable({ emitEvent: false });
    this.orderForm.get('paymentTreasuryId')?.enable({ emitEvent: false });
    this.orderForm.get('paymentDocument')?.enable({ emitEvent: false });
    if (this.currentInvoiceId <= 0) {
      this.orderForm.get('customerId')?.enable({ emitEvent: false });
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
      const data = (this.linesGrid?.dataSource as IInvoiceLine[]) ?? this.lines;
      this.lines = [...data];
    } else {
      const data =
        (this.discountsGrid?.dataSource as IInvoiceDiscount[]) ?? this.discounts;
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

  private createEmptyLine(): IInvoiceLine {
    return {
      invoiceId: this.currentInvoiceId,
      invoiceRowNumber: 0,
      merchandiseId: null,
      itemCode: '',
      description: '',
      taxCode: '',
      quantity: 0,
      unit: '',
      weight: 0,
      priceByUnit: 0,
      merchandiseDiscount: 0,
      customerDiscount: 0,
      priceOfferDiscount: 0,
      totalPrice: 0,
      invoiceRowTypeName: 'Normal',
    };
  }

  private createEmptyDiscount(): IInvoiceDiscount {
    return {
      invoiceId: this.currentInvoiceId,
      invoiceDiscountRowNumber: 0,
      description: '',
      discountRate: 0,
      totalDiscount: 0,
      subtotalInvoice: 0,
    };
  }

  onMerchandiseChange(args?: ChangeEventArgs): void {
    const previousId = this.lastLineMerchandiseId;
    const merchandiseId = this.merchandiseIdFromChange(args);
    this.lineData = {
      ...this.lineData,
      merchandiseId: merchandiseId > 0 ? merchandiseId : null,
    };
    this.applyMerchandiseToLine();
    if (merchandiseId > 0 && merchandiseId !== previousId) {
      this.lastLineMerchandiseId = merchandiseId;
      this.seedDefaultLineUnit();
      const item = this.merchandises.find(
        (row) => Number(row.merchandiseId) === merchandiseId
      );
      this.lineData = {
        ...this.lineData,
        taxCode: item?.ivaRateType || '',
      };
      this.merchandisePick$.next(merchandiseId);
    }
    this.cdr.detectChanges();
  }

  private merchandiseIdFromChange(args?: ChangeEventArgs): number {
    const item = args?.itemData as IPurchaseMerchandise | undefined;
    return (
      Number(args?.value) ||
      Number(item?.merchandiseId) ||
      Number(this.lineData.merchandiseId) ||
      0
    );
  }

  private applyMerchandiseToLine(): void {
    const merchandiseId = Number(this.lineData.merchandiseId) || 0;
    this.lineData.merchandiseId = merchandiseId > 0 ? merchandiseId : null;
    const item = this.merchandises.find(
      (row) => Number(row.merchandiseId) === merchandiseId
    );
    if (!item) {
      return;
    }
    this.lineData = {
      ...this.lineData,
      itemCode: item.alternCode ?? '',
      description: (item.name ?? '').trim() || (item.description ?? '').trim(),
      taxCode: this.lineData.taxCode || item.ivaRateType || '',
    };
  }

  private seedDefaultLineUnit(): void {
    this.lineUnitOptions = [{ code: 'UND', weight: 0, wholesale: true }];
    this.lineData = {
      ...this.lineData,
      unit: 'UND',
    };
  }

  private applyLineUnitDefaults(defaults: {
    units: IPurchaseUnit[];
    unit: string;
    taxCode: string;
    weight: number | null;
  }): void {
    const units =
      defaults.units?.length > 0
        ? defaults.units
        : [{ code: 'UND', weight: 0, wholesale: true }];
    this.lineUnitOptions = [...units];
    const current = (this.lineData.unit ?? '').trim();
    const known = units.some((item) => item.code === current);
    const nextUnit =
      (known && current) || defaults.unit || units[0]?.code || 'UND';
    this.lineData = {
      ...this.lineData,
      unit: nextUnit,
      taxCode: this.lineData.taxCode || defaults.taxCode || '',
    };
    this.applyWeightFromSelectedUnit();
    this.cdr.detectChanges();
  }

  onUnitChange(): void {
    this.applyWeightFromSelectedUnit();
    this.cdr.markForCheck();
  }

  onTaxCodeChange(args?: ChangeEventArgs): void {
    const value = String(args?.value ?? this.lineData.taxCode ?? '')
      .trim()
      .charAt(0)
      .toUpperCase();
    this.lineData = {
      ...this.lineData,
      taxCode: value || 'A',
    };
    this.cdr.detectChanges();
  }

  private buildTaxCodeOptions(
    rows: { taxType?: string; description?: string; rateType?: string }[]
  ): { code: string }[] {
    const ivaRows = (rows ?? []).filter((row) =>
      /IVA/i.test(`${row.taxType ?? ''} ${row.description ?? ''}`)
    );
    const pool = ivaRows.length ? ivaRows : rows ?? [];
    const codes = [
      ...new Set(
        pool
          .map((row) =>
            (row.rateType ?? '').toString().trim().charAt(0).toUpperCase()
          )
          .filter((code) => !!code)
      ),
    ];
    for (const fallback of ['A', 'E']) {
      if (!codes.includes(fallback)) {
        codes.push(fallback);
      }
    }
    const current = (this.lineData.taxCode ?? '')
      .toString()
      .trim()
      .charAt(0)
      .toUpperCase();
    if (current && !codes.includes(current)) {
      codes.unshift(current);
    }
    return codes.map((code) => ({ code }));
  }

  private applyWeightFromSelectedUnit(): void {
    const unit = (this.lineData.unit ?? '').trim();
    const option = this.lineUnitOptions.find((item) => item.code === unit);
    if (option) {
      this.lineData.weight = option.weight;
    }
  }

  onLineAmountChange(): void {
    this.lineData.merchandiseDiscount = this.fromPercent(this.lineMerchDiscPct);
    this.lineData.customerDiscount = this.fromPercent(this.lineCustomerDiscPct);
    this.lineData.priceOfferDiscount = this.fromPercent(this.lineOfferDiscPct);
    Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
    this.cdr.markForCheck();
  }

  private computeLineAmounts(line: IInvoiceLine): {
    totalPrice: number;
    totalDiscount: number;
    totalPriceAndDiscounts: number;
  } {
    const quantity = Number(line.quantity) || 0;
    const price = Number(line.priceByUnit) || 0;
    const merchRate = Number(line.merchandiseDiscount) || 0;
    const customerRate = Number(line.customerDiscount) || 0;
    const offerRate = Number(line.priceOfferDiscount) || 0;
    const gross = this.round2(quantity * price);
    const afterMerchandise = this.round2(
      Math.max(0, gross - this.round2(gross * merchRate))
    );
    const afterCustomer = this.round2(
      Math.max(0, afterMerchandise - this.round2(afterMerchandise * customerRate))
    );
    const totalPriceAndDiscounts = this.round2(
      Math.max(0, afterCustomer - this.round2(afterCustomer * offerRate))
    );
    const totalDiscount = this.round2(
      Math.max(0, gross - totalPriceAndDiscounts)
    );
    return {
      totalPrice: totalPriceAndDiscounts,
      totalDiscount,
      totalPriceAndDiscounts,
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
      return Number.isNaN(value.getTime())
        ? null
        : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  private sumBy<T>(
    items: T[],
    pick: (item: T) => number | null | undefined
  ): number {
    return items.reduce((sum, item) => sum + (Number(pick(item)) || 0), 0);
  }

  private updateLinesHeight(): void {
    const host = document.getElementById('invoice-lines-grid');
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
