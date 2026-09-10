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
import { IProvider, IPaymentTerm, CREDIT_CASH_OPTIONS, toCreditCash } from '../../provider';
import { ProviderService } from '../../provider.service';
import { PurchaseService } from '../../purchases/purchase.service';
import { IPurchase } from '../../purchases/purchase';
import { AccountsService } from '@views/accounting/accounts/accounts.service';
import { IAccount } from '@views/accounting/accounts/account';
import { IAccountClass } from '@views/accounting/classes/class';
import { CreditNoteService } from '../credit-note.service';
import {
  ICreditNote,
  ICreditNoteDiscount,
  ICreditNoteLine,
  ICreditNoteMerchandise,
  ICreditNoteTax,
  ICreditNoteUnit,
} from '../credit-note';

@Component({
  selector: 'llion-credit-note-detail',
  templateUrl: './credit-note-detail.html',
  styleUrls: ['./credit-note-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CreditNoteDetailComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('discountsgrid') discountsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('discountForm') discountForm?: NgForm;

  readonly discountsGridHeight = 88;
  readonly footerGridRowHeight = 28;

  orderForm!: FormGroup;
  order$!: Observable<ICreditNote>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  providers$!: Observable<IProvider[]>;
  terms$!: Observable<IPaymentTerm[]>;
  accounts$!: Observable<IAccount[]>;
  classes$!: Observable<IAccountClass[]>;
  warehouses$!: Observable<IGroup[]>;
  relatedBills$!: Observable<IPurchase[]>;
  merchandises$!: Observable<ICreditNoteMerchandise[]>;
  providerFields = { text: 'description', value: 'providerId' };
  termFields = { text: 'termsDescription', value: 'termsId' };
  accountFields = { text: 'fullName', value: 'accountId' };
  classFields = { text: 'fullName', value: 'classId' };
  creditCashFields = { text: 'text', value: 'value' };
  creditCashOptions = CREDIT_CASH_OPTIONS;
  warehouseFields = { text: 'fullName', value: 'groupId' };
  billFields = { text: 'billNumber', value: 'billId' };
  merchandiseFields = { text: 'name', value: 'merchandiseId' };
  unitFields = { text: 'code', value: 'code' };
  taxCodeFields = { text: 'code', value: 'code' };
  providerFilterType: 'Contains' = 'Contains';
  lineUnitOptions: ICreditNoteUnit[] = [];
  taxCodeOptions: { code: string }[] = [];
  lines: ICreditNoteLine[] = [];
  discounts: ICreditNoteDiscount[] = [];
  taxes: ICreditNoteTax[] = [];
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

  lineData: ICreditNoteLine = this.createEmptyLine();
  discountData: ICreditNoteDiscount = this.createEmptyDiscount();
  lineMerchDiscPct = 0;
  lineVendorDiscPct = 0;
  lineAcceptancePct = 0;
  discountRatePct = 0;

  currentCrnId = 0;
  private currentOrder: ICreditNote | null = null;
  private providers: IProvider[] = [];
  private terms: IPaymentTerm[] = [];
  private merchandises: ICreditNoteMerchandise[] = [];
  private taxCatalogRows: { taxType?: string; description?: string; rateType?: string }[] =
    [];
  private lastLineMerchandiseId = 0;
  private readonly merchandisePick$ = new Subject<number>();
  private saving = false;
  private readonly destroy$ = new Subject<void>();

  get providerDropdownEnabled(): boolean {
    return this.gridEnabled && this.currentCrnId <= 0;
  }

  constructor(
    private formBuilder: FormBuilder,
    private purchaseService: CreditNoteService,
    private billsService: PurchaseService,
    private providerService: ProviderService,
    private accountsService: AccountsService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderForm = this.formBuilder.group({
      crnNumber: [''],
      issueDate: [null as Date | null],
      dueDate: [null as Date | null],
      issueDateTax: [null as Date | null],
      statusName: [''],
      providerId: [null as number | null],
      creditCash: [0],
      creditTerm: [null as number | null],
      billId: [null as number | null],
      warehouseId: [null as number | null],
      crnSeriesCode: [''],
      accountId: [null as number | null],
      classId: [null as number | null],
      referenceNumber: [''],
      comment: [''],
    });
    this.orderForm.disable({ emitEvent: false });

    this.enabled$ = this.purchaseService.enableFormAction$;
    this.order$ = this.purchaseService.creditNoteSelected$;
    this.warehouses$ = this.purchaseService.warehouses$;
    this.relatedBills$ = this.billsService.purchases$;
    this.providers$ = this.providerService.providers$.pipe(
      map((rows) =>
        [...(rows ?? [])]
          .map((row) => ({
            ...row,
            providerId: Number(row.providerId) || 0,
          }))
          .filter((row) => row.providerId > 0)
          .sort((a, b) =>
            (a.description ?? '').localeCompare(b.description ?? '', 'es', {
              sensitivity: 'base',
            })
          )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.providers$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.providers = rows;
      this.cdr.markForCheck();
    });
    this.terms$ = this.providerService.terms$;
    this.terms$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.terms = rows ?? [];
      if (this.gridEnabled && this.currentCrnId <= 0) {
        this.applyDueDateFromCreditTerm();
      }
      this.cdr.markForCheck();
    });
    this.accounts$ = this.accountsService.accounts$.pipe(
      map((rows) =>
        (rows ?? []).filter(
          (row) => row.accountId > 0 && row.isActive !== false
        )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.classes$ = this.accountsService.classes$.pipe(
      map((rows) =>
        (rows ?? []).filter(
          (row) => row.classId > 0 && row.isActive !== false
        )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.merchandises$ = this.purchaseService.merchandises$;
    this.merchandises$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
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
      map(([editing, order]) => editing || (order?.crnId ?? 0) > 0)
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

    this.orderForm
      .get('issueDateTax')
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
    this.purchaseService.cancelEdit();
  }

  onAcceptClick(): void {
    if (!this.gridEnabled || this.saving) {
      return;
    }
    this.syncGridRows('lines');
    this.syncGridRows('discounts');

    const form = this.orderForm.getRawValue();
    const isNew = this.currentCrnId <= 0;
    const crnNumber = String(form.crnNumber ?? '').trim();
    if (isNew && !crnNumber) {
      this.toastService.showMyToast(
        'Indique el número de la nota crédito',
        toastType.warning
      );
      return;
    }

    const providerId = Number(form.providerId) || 0;
    if (providerId <= 0) {
      this.toastService.showMyToast(
        'Seleccione un proveedor',
        toastType.warning
      );
      return;
    }

    const warehouseId = Number(form.warehouseId) || 0;
    if (warehouseId <= 0) {
      this.toastService.showMyToast(
        'Seleccione el almacén',
        toastType.warning
      );
      return;
    }

    this.lines = this.lines.map((line, index) => {
      const amounts = this.computeLineAmounts(line);
      return {
        ...line,
        crnId: this.currentCrnId,
        crnRowNumber: line.crnRowNumber || index + 1,
        taxCode: this.normalizedTaxCode(line.taxCode, false),
        totalCost: amounts.totalCost,
        totalDiscount: amounts.totalDiscount,
        totalCostAndDiscounts: amounts.totalCostAndDiscounts,
      };
    });
    this.recalculateDocument();

    const provider = this.providers.find((row) => row.providerId === providerId);
    const payload: ICreditNote = {
      ...(this.currentOrder ?? this.purchaseService.createEmptyCreditNote()),
      crnId: this.currentCrnId,
      crnNumber: isNew ? crnNumber : this.currentOrder?.crnNumber ?? crnNumber,
      providerId,
      providerCode: provider?.alternCode ?? this.currentOrder?.providerCode ?? '',
      providerName:
        provider?.description ?? this.currentOrder?.providerName ?? '',
      issueDate: form.issueDate,
      issueDateTax: form.issueDateTax ?? form.issueDate,
      dueDate: form.dueDate ?? form.issueDate,
      journalEntryDate: form.issueDate,
      creditCash: toCreditCash(form.creditCash),
      creditTerm: Number(form.creditTerm) || null,
      accountId: Number(form.accountId) || null,
      classId: Number(form.classId) || null,
      billId: Number(form.billId) || null,
      crnSeriesCode: form.crnSeriesCode ?? '',
      warehouseId,
      referenceNumber: form.referenceNumber ?? '',
      comment: form.comment ?? '',
      status: isNew ? 0 : this.currentOrder?.status ?? 0,
      statusName: isNew
        ? 'Pendiente'
        : this.currentOrder?.statusName ?? form.statusName ?? '',
      organizationId:
        this.currentOrder?.organizationId ||
        this.purchaseService.currentOrganizationId,
      lines: this.lines,
      discounts: this.discounts.map((item, index) => ({
        ...item,
        crnId: this.currentCrnId,
        crnDiscountRowNumber: item.crnDiscountRowNumber || index + 1,
        totalDiscount: this.round2(Number(item.totalDiscount) || 0),
      })),
      taxes: this.taxes,
    };

    this.saving = true;
    this.purchaseService
      .saveCreditNote(payload)
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
      const row = (args.rowData ?? {}) as Partial<ICreditNoteLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.createEmptyLine()
          : { ...this.createEmptyLine(), ...row };
      if (args.requestType === 'add') {
        this.lineData.crnRowNumber = this.nextNumber(
          this.lines,
          (line) => line.crnRowNumber
        );
      }
      this.lineMerchDiscPct = this.toPercent(this.lineData.merchandiseDiscount);
      this.lineVendorDiscPct = this.toPercent(this.lineData.vendorDiscount);
      this.lineAcceptancePct = this.toPercent(this.lineData.acceptanceRate);
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
      this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
      this.lineData.acceptanceRate = this.fromPercent(this.lineAcceptancePct);
      Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
      args.data = { ...this.lineData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<ICreditNoteLine>(args.data);
      if (!row?.crnRowNumber) {
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
      const row = (args.rowData ?? {}) as Partial<ICreditNoteDiscount>;
      this.discountData =
        args.requestType === 'add'
          ? this.createEmptyDiscount()
          : { ...this.createEmptyDiscount(), ...row };
      if (args.requestType === 'add') {
        this.discountData.crnDiscountRowNumber = this.nextNumber(
          this.discounts,
          (item) => item.crnDiscountRowNumber
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
      const row = this.firstRow<ICreditNoteDiscount>(args.data);
      if (!row?.crnDiscountRowNumber) {
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

  onIssueDateChange(): void {
    this.applyDueDateFromCreditTerm();
    this.cdr.markForCheck();
  }

  onProviderChange(args?: ChangeEventArgs): void {
    if (!this.gridEnabled) {
      return;
    }
    const providerId =
      Number(args?.value) ||
      Number(this.orderForm.getRawValue().providerId) ||
      0;
    const provider = this.providers.find((row) => row.providerId === providerId);
    const termsId = Number(provider?.termsId) || null;
    const accountId = Number(provider?.accountId) || null;
    const classId = Number(provider?.classId) || null;
    this.orderForm.patchValue(
      {
        creditTerm: termsId && termsId > 0 ? termsId : null,
        accountId: accountId && accountId > 0 ? accountId : null,
        classId: classId && classId > 0 ? classId : null,
      },
      { emitEvent: false }
    );
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
    const issueDate = this.asDate(this.orderForm.getRawValue().issueDate);
    if (!issueDate) {
      this.orderForm.patchValue({ dueDate: null }, { emitEvent: false });
      return;
    }
    const creditCash = toCreditCash(this.orderForm.getRawValue().creditCash);
    if (creditCash === 1) {
      this.orderForm.patchValue({ dueDate: issueDate }, { emitEvent: false });
      return;
    }
    const termsId = Number(this.orderForm.getRawValue().creditTerm) || 0;
    const term = this.terms.find((row) => row.termsId === termsId);
    const days = termsId > 0 ? Number(term?.rangeDays) || 0 : 0;
    this.orderForm.patchValue(
      { dueDate: this.addDays(issueDate, days) },
      { emitEvent: false }
    );
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    next.setDate(next.getDate() + (Number(days) || 0));
    return next;
  }

  private patchOrder(order: ICreditNote): void {
    this.currentCrnId = Number(order.crnId) || 0;
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
        crnNumber: order.crnNumber ?? '',
        issueDate,
        dueDate: this.asDate(order.dueDate) ?? issueDate,
        issueDateTax: this.asDate(order.issueDateTax) ?? issueDate,
        statusName: order.statusName ?? (this.currentCrnId <= 0 ? 'Pendiente' : ''),
        providerId: Number(order.providerId) > 0 ? Number(order.providerId) : null,
        creditCash: toCreditCash(order.creditCash),
        creditTerm: Number(order.creditTerm) > 0 ? Number(order.creditTerm) : null,
        accountId: Number(order.accountId) > 0 ? Number(order.accountId) : null,
        classId: Number(order.classId) > 0 ? Number(order.classId) : null,
        billId: Number(order.billId) > 0 ? Number(order.billId) : null,
        warehouseId:
          Number(order.warehouseId) > 0 ? Number(order.warehouseId) : null,
        crnSeriesCode: order.crnSeriesCode ?? '',
        referenceNumber: order.referenceNumber ?? '',
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

  private lineBase(line: ICreditNoteLine): number {
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
          (Number(a.crnDiscountRowNumber) || 0) -
          (Number(b.crnDiscountRowNumber) || 0)
      )
      .map((item) => {
        const rate = Number(item.discountRate) || 0;
        const totalDiscount = this.round2(running * rate);
        const subtotalCRN = this.round2(Math.max(0, running - totalDiscount));
        running = subtotalCRN;
        return {
          ...item,
          totalDiscount,
          subtotalCRN,
        };
      });
    if (this.discountsGrid) {
      this.discountsGrid.dataSource = this.discounts;
    }
  }

  private previewDiscountRow(row: ICreditNoteDiscount): void {
    const base = this.discountBaseBefore(row.crnDiscountRowNumber);
    const rate = this.fromPercent(this.discountRatePct);
    row.discountRate = rate;
    row.totalDiscount = this.round2(base * rate);
    row.subtotalCRN = this.round2(Math.max(0, base - row.totalDiscount));
  }

  private discountBaseBefore(rowNumber: number): number {
    const invoiceNet = this.linesBaseTotal();
    const previous = [...this.discounts]
      .filter(
        (item) => (Number(item.crnDiscountRowNumber) || 0) < (rowNumber || 0)
      )
      .sort(
        (a, b) =>
          (Number(a.crnDiscountRowNumber) || 0) -
          (Number(b.crnDiscountRowNumber) || 0)
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
        (Number(a.crnDiscountRowNumber) || 0) -
        (Number(b.crnDiscountRowNumber) || 0)
    )[this.discounts.length - 1];
    const subtotal = Number(last?.subtotalCRN);
    return Number.isFinite(subtotal)
      ? this.round2(subtotal)
      : this.linesBaseTotal();
  }

  private applyInvoiceDiscounts(amount: number): number {
    let running = this.round2(amount);
    const rows = [...this.discounts].sort(
      (a, b) =>
        (Number(a.crnDiscountRowNumber) || 0) -
        (Number(b.crnDiscountRowNumber) || 0)
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
      this.asDate(this.orderForm?.getRawValue()?.issueDateTax) ??
      this.asDate(this.currentOrder?.issueDateTax) ??
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
          this.purchaseService.taxRateFor(taxCode, taxDate) ?? 0;
        return {
          crnId: this.currentCrnId,
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

  private refreshTotals(order?: ICreditNote): void {
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
    this.orderForm.disable({ emitEvent: false });
    if (!enabled) {
      return;
    }
    this.orderForm.get('issueDate')?.enable({ emitEvent: false });
    this.orderForm.get('issueDateTax')?.enable({ emitEvent: false });
    this.orderForm.get('creditCash')?.enable({ emitEvent: false });
    this.orderForm.get('creditTerm')?.enable({ emitEvent: false });
    this.orderForm.get('billId')?.enable({ emitEvent: false });
    this.orderForm.get('crnSeriesCode')?.enable({ emitEvent: false });
    this.orderForm.get('accountId')?.enable({ emitEvent: false });
    this.orderForm.get('classId')?.enable({ emitEvent: false });
    this.orderForm.get('warehouseId')?.enable({ emitEvent: false });
    this.orderForm.get('referenceNumber')?.enable({ emitEvent: false });
    this.orderForm.get('comment')?.enable({ emitEvent: false });
    if (this.currentCrnId <= 0) {
      this.orderForm.get('providerId')?.enable({ emitEvent: false });
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
        (this.linesGrid?.dataSource as ICreditNoteLine[]) ?? this.lines;
      this.lines = [...data];
    } else {
      const data =
        (this.discountsGrid?.dataSource as ICreditNoteDiscount[]) ??
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

  private createEmptyLine(): ICreditNoteLine {
    return {
      crnId: this.currentCrnId,
      crnRowNumber: 0,
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

  private createEmptyDiscount(): ICreditNoteDiscount {
    return {
      crnId: this.currentCrnId,
      crnDiscountRowNumber: 0,
      description: '',
      discountRate: 0,
      totalDiscount: 0,
      subtotalCRN: 0,
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
    const item = args?.itemData as ICreditNoteMerchandise | undefined;
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
    units: ICreditNoteUnit[];
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
    this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
    Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
    this.cdr.markForCheck();
  }

  private computeLineAmounts(line: ICreditNoteLine): {
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
    const host = document.getElementById('credit-note-lines-grid');
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
