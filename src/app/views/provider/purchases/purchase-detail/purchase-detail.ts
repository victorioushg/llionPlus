import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonPropsModel } from '@syncfusion/ej2-popups';
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
  of,
  shareReplay,
  switchMap,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { openPdfBlob } from '@shared/utils/open-pdf-blob';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IGroup } from '@shared/models/group';
import { IProvider, IPaymentTerm, CREDIT_CASH_OPTIONS, toCreditCash } from '../../provider';
import { ProviderService } from '../../provider.service';
import { PurchaseService } from '../purchase.service';
import { AccountsService } from '@views/accounting/accounts/accounts.service';
import { IAccount } from '@views/accounting/accounts/account';
import { IAccountClass } from '@views/accounting/classes/class';
import { ApplicationService } from '@shared/services/applicattionService';
import { TreasuryService } from '@views/treasury/treasury.service';
import {
  ITreasury,
  TREASURY_TYPE_CASHBOX,
} from '@views/treasury/treasury';
import {
  IPurchase,
  IPurchaseDiscount,
  IPurchaseLine,
  IPurchaseMerchandise,
  IPurchaseTax,
  IPurchaseUnit,
  IInvoicePrevalidationResult,
} from '../purchase';

@Component({
  selector: 'llion-purchase-detail',
  templateUrl: './purchase-detail.html',
  styleUrls: ['./purchase-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PurchaseDetailComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('discountsgrid') discountsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('discountForm') discountForm?: NgForm;
  @ViewChild('invoiceFileInput') invoiceFileInput?: ElementRef<HTMLInputElement>;

  readonly discountsGridHeight = 88;
  readonly footerGridRowHeight = 28;

  orderForm!: FormGroup;
  order$!: Observable<IPurchase>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  providers$!: Observable<IProvider[]>;
  terms$!: Observable<IPaymentTerm[]>;
  accounts$!: Observable<IAccount[]>;
  classes$!: Observable<IAccountClass[]>;
  warehouses$!: Observable<IGroup[]>;
  merchandises$!: Observable<IPurchaseMerchandise[]>;
  treasuries$!: Observable<Array<ITreasury & { group: string }>>;
  providerFields = { text: 'description', value: 'providerId' };
  termFields = { text: 'termsDescription', value: 'termsId' };
  accountFields = { text: 'fullName', value: 'accountId' };
  classFields = { text: 'fullName', value: 'classId' };
  creditCashFields = { text: 'text', value: 'value' };
  creditCashOptions = CREDIT_CASH_OPTIONS;
  creditTypeOptions = [
    { text: 'Vencimiento', value: 0 },
    { text: 'Giros', value: 1 },
  ];
  interestCalcOptions = [
    { text: 'Simple', value: 0 },
    { text: 'Compuesto', value: 1 },
  ];
  paymentDialogButtons: ButtonPropsModel[] = [
    {
      click: () => this.cancelPaymentDialog(),
      buttonModel: { content: 'Cancelar' },
    },
    {
      click: () => this.confirmPaymentDialog(),
      buttonModel: { content: 'Aceptar', isPrimary: true },
    },
  ];
  purchasePaymentTypes = [
    { text: 'Efectivo', value: 0 },
    { text: 'Cheque', value: 1 },
    { text: 'Tarjeta', value: 2 },
    { text: 'Transferencia', value: 3 },
  ];
  treasuryFields = {
    text: 'treasuryName',
    value: 'treasuryId',
    groupBy: 'group',
  };
  warehouseFields = { text: 'fullName', value: 'groupId' };
  merchandiseFields = { text: 'name', value: 'merchandiseId' };
  unitFields = { text: 'code', value: 'code' };
  taxCodeFields = { text: 'code', value: 'code' };
  providerFilterType: 'Contains' = 'Contains';
  lineUnitOptions: IPurchaseUnit[] = [];
  taxCodeOptions: { code: string }[] = [];
  lines: IPurchaseLine[] = [];
  discounts: IPurchaseDiscount[] = [];
  taxes: IPurchaseTax[] = [];
  totalWeight = 0;
  totalItems = 0;
  netTotal = 0;
  discountTotal = 0;
  taxTotal = 0;
  grandTotal = 0;
  linesHeight = 160;
  gridEnabled = false;
  paymentDialogVisible = false;
  paymentForm!: FormGroup;
  paymentDueMinDate: Date | null = null;
  private pendingPurchase: IPurchase | null = null;

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

  lineData: IPurchaseLine = this.createEmptyLine();
  discountData: IPurchaseDiscount = this.createEmptyDiscount();
  lineMerchDiscPct = 0;
  lineVendorDiscPct = 0;
  discountRatePct = 0;

  currentBillId = 0;
  hasLinkedInvoice = false;
  invoiceReaderOpen = false;
  invoiceBusy = false;
  printBusy = false;
  invoicePreviewUrl: SafeResourceUrl | null = null;
  invoicePreviewKind: 'pdf' | 'image' | null = null;
  invoiceFileName = '';
  invoicePendingBase64 = '';
  invoicePendingContentType = '';
  invoiceResult: IInvoicePrevalidationResult | null = null;
  private invoiceObjectUrl: string | null = null;
  private currentOrder: IPurchase | null = null;
  private providers: IProvider[] = [];
  private terms: IPaymentTerm[] = [];
  private merchandises: IPurchaseMerchandise[] = [];
  private treasuries: Array<ITreasury & { group: string }> = [];
  private taxCatalogRows: { taxType?: string; description?: string; rateType?: string }[] =
    [];
  private lastLineMerchandiseId = 0;
  private readonly merchandisePick$ = new Subject<number>();
  private saving = false;
  private readonly destroy$ = new Subject<void>();

  get providerDropdownEnabled(): boolean {
    return this.gridEnabled && this.currentBillId <= 0;
  }

  get isPaymentCash(): boolean {
    return toCreditCash(this.paymentForm?.getRawValue()?.creditCash) === 1;
  }

  get isPaymentVencimiento(): boolean {
    return !this.isPaymentCash && Number(this.paymentForm?.getRawValue()?.creditType) === 0;
  }

  get isPaymentGiros(): boolean {
    return !this.isPaymentCash && Number(this.paymentForm?.getRawValue()?.creditType) === 1;
  }

  constructor(
    private formBuilder: FormBuilder,
    private purchaseService: PurchaseService,
    private providerService: ProviderService,
    private accountsService: AccountsService,
    private applicationService: ApplicationService,
    private treasuryService: TreasuryService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderForm = this.formBuilder.group({
      billNumber: [''],
      issueDate: [null as Date | null],
      dueDate: [null as Date | null],
      issueDateTax: [null as Date | null],
      statusName: [''],
      providerId: [null as number | null],
      creditCash: [0],
      creditTerm: [null as number | null],
      warehouseId: [null as number | null],
      billSeriesCode: [''],
      taxControlNumber: [''],
      accountId: [null as number | null],
      classId: [null as number | null],
      referenceNumber: [''],
      comment: [''],
    });
    this.orderForm.disable({ emitEvent: false });
    this.paymentForm = this.formBuilder.group({
      creditCash: [0],
      creditType: [0],
      dueDate: [null as Date | null],
      paymentTreasuryId: [null as number | null],
      paymentType: [0],
      paymentName: [''],
      paymentDocument: [''],
      beneficiary: [''],
      amount: [0],
      paymentDueDate: [null as Date | null],
      draftDownpayment: [0],
      draftSerieNumber: [''],
      draftsNumber: [null as number | null],
      draftsPeriod: [null as number | null],
      compoundInterest: [0],
      interestRatePct: [0],
      interestAmount: [0],
    });

    this.enabled$ = this.purchaseService.enableFormAction$;
    this.order$ = this.purchaseService.purchaseSelected$;
    this.warehouses$ = this.purchaseService.warehouses$;
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
      if (this.gridEnabled && this.currentBillId <= 0) {
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
    this.treasuries$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.treasuries = rows ?? [];
      this.cdr.markForCheck();
    });
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
      map(([editing, order]) => editing || (order?.billId ?? 0) > 0)
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
    this.clearInvoicePreview();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLinesDataBound(): void {
    this.updateLinesHeight();
  }

  onCancelClick(): void {
    this.purchaseService.cancelEdit();
  }

  get invoiceButtonTitle(): string {
    return this.hasLinkedInvoice ? 'Ver factura' : 'Importar factura';
  }

  printPurchase(): void {
    if (this.currentBillId <= 0) {
      this.toastService.showMyToast(
        'Guarde la compra antes de imprimir',
        toastType.warning
      );
      return;
    }
    if (this.printBusy) {
      return;
    }
    this.printBusy = true;
    this.cdr.markForCheck();
    this.purchaseService
      .printPurchasePdf(this.currentBillId)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.printBusy = false;
          this.cdr.markForCheck();
          const result = openPdfBlob(blob, `compra-${this.currentBillId}.pdf`);
          if (result === 'empty') {
            this.toastService.showMyToast(
              'No se generó el PDF de la compra',
              toastType.warning
            );
          } else if (result === 'json') {
            this.toastService.showMyToast(
              'No se pudo imprimir la compra',
              toastType.error
            );
          }
        },
        error: () => {
          this.printBusy = false;
          this.cdr.markForCheck();
        },
      });
  }

  openInvoiceDocument(): void {
    this.invoiceReaderOpen = true;
    this.invoiceResult = null;
    this.invoicePendingBase64 = '';
    this.invoicePendingContentType = '';
    this.invoiceFileName = '';
    this.clearInvoicePreview();
    if (this.currentBillId > 0 && this.hasLinkedInvoice) {
      this.loadLinkedInvoiceFile(this.currentBillId);
    }
    this.cdr.markForCheck();
  }

  closeInvoiceDocument(): void {
    this.invoiceReaderOpen = false;
    this.invoiceBusy = false;
    this.invoiceResult = null;
    this.invoicePendingBase64 = '';
    this.clearInvoicePreview();
    if (this.invoiceFileInput?.nativeElement) {
      this.invoiceFileInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  onInvoiceFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.readInvoiceFile(file);
  }

  saveValidatedInvoice(): void {
    if (!this.invoiceResult?.isValidInvoice || !this.invoicePendingBase64) {
      this.toastService.showMyToast(
        'La factura no es válida o no hay archivo para guardar',
        toastType.warning
      );
      return;
    }
    this.invoiceBusy = true;
    this.purchaseService
      .saveInvoiceMedia({
        fileName: this.invoiceFileName,
        contentType: this.invoicePendingContentType,
        fileDataBase64: this.invoicePendingBase64,
        organizationId: this.purchaseService.currentOrganizationId,
        vendorId: Number(this.orderForm.getRawValue().providerId) || null,
        billId: this.currentBillId > 0 ? this.currentBillId : null,
      })
      .pipe(take(1))
      .subscribe({
        next: (saved) => {
          this.invoiceBusy = false;
          if (saved?.saved) {
            this.hasLinkedInvoice = true;
            this.invoiceResult = saved.prevalidation ?? this.invoiceResult;
          } else if (saved?.prevalidation) {
            this.invoiceResult = saved.prevalidation;
            this.toastService.showMyToast(
              'La factura no se guardó: no superó la prevalidación',
              toastType.warning
            );
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.invoiceBusy = false;
          this.cdr.markForCheck();
        },
      });
  }

  private refreshLinkedInvoice(billId: number): void {
    if (billId <= 0) {
      this.hasLinkedInvoice = false;
      this.cdr.markForCheck();
      return;
    }
    this.purchaseService
      .getInvoiceMediaByBill(billId)
      .pipe(take(1))
      .subscribe((media) => {
        this.hasLinkedInvoice = !!media?.mediaId;
        this.cdr.markForCheck();
      });
  }

  private loadLinkedInvoiceFile(billId: number): void {
    this.invoiceBusy = true;
    this.purchaseService
      .getInvoiceMediaByBill(billId)
      .pipe(
        take(1),
        switchMap((media) => {
          if (!media?.mediaId) {
            this.hasLinkedInvoice = false;
            return of(null);
          }
          this.invoiceFileName = media.fileName || '';
          return this.purchaseService.getInvoiceMediaFile(media.mediaId);
        })
      )
      .subscribe({
        next: (file) => {
          this.invoiceBusy = false;
          if (file?.fileDataBase64) {
            this.showInvoicePreview(file.fileDataBase64, file.contentType || '');
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.invoiceBusy = false;
          this.cdr.markForCheck();
        },
      });
  }

  private readInvoiceFile(file: File): void {
    const allowed = /pdf|png|jpe?g|gif|bmp|tiff?|webp$/i;
    if (!allowed.test(file.type || file.name)) {
      this.toastService.showMyToast(
        'Use PDF o imagen (png, jpg, gif, bmp, tif, webp)',
        toastType.warning
      );
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      this.toastService.showMyToast(
        'El archivo no debe superar 12 MB',
        toastType.warning
      );
      return;
    }

    this.invoiceBusy = true;
    this.invoiceFileName = file.name;
    this.invoicePendingContentType = file.type || 'application/octet-stream';
    this.invoiceResult = null;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.invoicePendingBase64 = dataUrl;
      this.showInvoicePreview(dataUrl, this.invoicePendingContentType);
      this.purchaseService
        .prevalidateInvoice({
          fileName: file.name,
          contentType: this.invoicePendingContentType,
          fileDataBase64: dataUrl,
          organizationId: this.purchaseService.currentOrganizationId,
          vendorId: Number(this.orderForm.getRawValue().providerId) || null,
          billId: this.currentBillId > 0 ? this.currentBillId : null,
        })
        .pipe(take(1))
        .subscribe({
          next: (result) => {
            this.invoiceBusy = false;
            this.invoiceResult = result;
            this.cdr.markForCheck();
          },
          error: () => {
            this.invoiceBusy = false;
            this.cdr.markForCheck();
          },
        });
    };
    reader.onerror = () => {
      this.invoiceBusy = false;
      this.toastService.showMyToast('No se pudo leer el archivo', toastType.error);
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  private showInvoicePreview(data: string, contentType: string): void {
    this.clearInvoicePreview();
    const type = (contentType || '').toLowerCase();
    const isPdf =
      type.includes('pdf') || this.invoiceFileName.toLowerCase().endsWith('.pdf');
    this.invoicePreviewKind = isPdf ? 'pdf' : 'image';
    let base64 = data;
    if (data.startsWith('data:')) {
      const comma = data.indexOf(',');
      base64 = comma >= 0 ? data.substring(comma + 1) : data;
    }
    const mime = type || (isPdf ? 'application/pdf' : 'image/png');
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    this.invoiceObjectUrl = URL.createObjectURL(blob);
    this.invoicePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.invoiceObjectUrl
    );
  }

  private clearInvoicePreview(): void {
    if (this.invoiceObjectUrl) {
      URL.revokeObjectURL(this.invoiceObjectUrl);
      this.invoiceObjectUrl = null;
    }
    this.invoicePreviewUrl = null;
    this.invoicePreviewKind = null;
  }

  onAcceptClick(): void {
    if (!this.gridEnabled || this.saving) {
      return;
    }
    this.syncGridRows('lines');
    this.syncGridRows('discounts');

    const form = this.orderForm.getRawValue();
    const isNew = this.currentBillId <= 0;
    const billNumber = String(form.billNumber ?? '').trim();
    if (isNew && !billNumber) {
      this.toastService.showMyToast(
        'Indique el número de la compra',
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
        billId: this.currentBillId,
        billRowNumber: line.billRowNumber || index + 1,
        taxCode: this.normalizedTaxCode(line.taxCode, false),
        totalCost: amounts.totalCost,
        totalDiscount: amounts.totalDiscount,
        totalCostAndDiscounts: amounts.totalCostAndDiscounts,
      };
    });
    this.recalculateDocument();

    const provider = this.providers.find((row) => row.providerId === providerId);
    const payload: IPurchase = {
      ...(this.currentOrder ?? this.purchaseService.createEmptyPurchase()),
      billId: this.currentBillId,
      billNumber: isNew ? billNumber : this.currentOrder?.billNumber ?? billNumber,
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
      billSeriesCode: form.billSeriesCode ?? '',
      taxControlNumber: form.taxControlNumber ?? '',
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
        billId: this.currentBillId,
        billDiscountRowNumber: item.billDiscountRowNumber || index + 1,
        totalDiscount: this.round2(Number(item.totalDiscount) || 0),
      })),
      taxes: this.taxes,
    };

    this.pendingPurchase = payload;
    this.openPaymentDialog(payload);
  }

  onPaymentConditionChange(): void {
    this.recalculateDraftInterest();
    this.cdr.markForCheck();
  }

  onPaymentCreditTypeChange(): void {
    this.recalculateDraftInterest();
    this.cdr.markForCheck();
  }

  onPaymentDraftChange(): void {
    this.recalculateDraftInterest();
    this.cdr.markForCheck();
  }

  onPaymentFormChange(): void {
    this.paymentForm.patchValue(
      { paymentName: '', paymentDocument: '', beneficiary: '' },
      { emitEvent: false }
    );
    this.cdr.markForCheck();
  }

  confirmPaymentDialog(): void {
    const payload = this.pendingPurchase;
    if (!payload) {
      this.cancelPaymentDialog();
      return;
    }
    const payment = this.paymentForm.getRawValue();
    const creditCash = toCreditCash(payment.creditCash);
    const issueDate = this.asDate(payload.issueDate) ?? this.startOfToday();
    if (creditCash === 1) {
      const treasuryId = Number(payment.paymentTreasuryId) || 0;
      if (treasuryId <= 0) {
        this.toastService.showMyToast(
          'Seleccione la caja o banco',
          toastType.warning
        );
        return;
      }
      const paymentType = Number(payment.paymentType) || 0;
      const paymentName = String(payment.paymentName ?? '').trim();
      if ((paymentType === 1 || paymentType === 3) && !paymentName) {
        this.toastService.showMyToast(
          'Indique el nombre de pago',
          toastType.warning
        );
        return;
      }
      payload.creditCash = 1;
      payload.dueDate = issueDate;
      payload.paymentTreasuryId = treasuryId;
      payload.paymentType = paymentType;
      payload.paymentDocument = String(payment.paymentDocument ?? '').trim();
      payload.beneficiary =
        String(payment.paymentName ?? '').trim() ||
        String(payment.beneficiary ?? '').trim();
      this.clearPurchaseDrafts(payload);
    } else {
      const creditType = Number(payment.creditType) || 0;
      let dueDate = this.asDate(payload.dueDate) ?? issueDate;
      if (creditType === 0) {
        dueDate = this.asDate(payment.dueDate) ?? dueDate;
        if (!dueDate) {
          this.toastService.showMyToast(
            'Indique la fecha de vencimiento',
            toastType.warning
          );
          return;
        }
        this.clearPurchaseDrafts(payload);
        payload.creditType = 0;
      } else {
        const draftsNumber = Number(payment.draftsNumber) || 0;
        const draftsPeriod = Number(payment.draftsPeriod) || 0;
        if (draftsNumber <= 0) {
          this.toastService.showMyToast(
            'Indique el número de giros',
            toastType.warning
          );
          return;
        }
        if (draftsPeriod <= 0) {
          this.toastService.showMyToast(
            'Indique el periodo entre giros',
            toastType.warning
          );
          return;
        }
        const draft = this.paymentForm.getRawValue();
        dueDate = this.addDays(issueDate, draftsNumber * draftsPeriod);
        payload.creditType = 1;
        payload.draftDownpayment = this.round2(Number(draft.draftDownpayment) || 0);
        payload.draftSerieNumber = String(draft.draftSerieNumber ?? '').trim();
        payload.draftsNumber = draftsNumber;
        payload.draftsPeriod = draftsPeriod;
        payload.compoundInterest = Number(draft.compoundInterest) === 1 ? 1 : 0;
        payload.interestRate = this.fromPercent(draft.interestRatePct);
        payload.interestAmount = this.round2(Number(draft.interestAmount) || 0);
      }
      payload.creditCash = 0;
      payload.dueDate = dueDate;
      payload.paymentTreasuryId = null;
      payload.paymentType = null;
      payload.paymentDocument = '';
      payload.beneficiary = '';
    }

    this.orderForm.patchValue(
      {
        creditCash: payload.creditCash,
        dueDate: payload.dueDate,
      },
      { emitEvent: false }
    );
    this.paymentDialogVisible = false;
    this.pendingPurchase = null;
    this.continuePurchaseSave(payload);
  }

  cancelPaymentDialog(): void {
    this.paymentDialogVisible = false;
    this.pendingPurchase = null;
    this.cdr.markForCheck();
  }

  private openPaymentDialog(payload: IPurchase): void {
    const issueDate = this.asDate(payload.issueDate) ?? this.startOfToday();
    this.paymentDueMinDate = issueDate;
    const current = this.currentOrder;
    const isGiros =
      toCreditCash(payload.creditCash) !== 1 &&
      (Number(current?.creditType) === 1 || Number(current?.draftsNumber) > 0);
    const defaultTreasury =
      Number(current?.paymentTreasuryId) ||
      this.treasuries.find(
        (row) => (row.treasuryType ?? '').toUpperCase() === TREASURY_TYPE_CASHBOX
      )?.treasuryId ||
      this.treasuries[0]?.treasuryId ||
      null;
    this.paymentForm.patchValue(
      {
        creditCash: toCreditCash(payload.creditCash),
        creditType: isGiros ? 1 : 0,
        dueDate: this.asDate(payload.dueDate) ?? issueDate,
        paymentTreasuryId: defaultTreasury,
        paymentType: Number(current?.paymentType) || 0,
        paymentName: current?.beneficiary ?? '',
        paymentDocument: current?.paymentDocument ?? '',
        beneficiary: current?.beneficiary ?? '',
        amount: this.grandTotal,
        paymentDueDate: issueDate,
        draftDownpayment: Number(current?.draftDownpayment) || 0,
        draftSerieNumber: current?.draftSerieNumber ?? '',
        draftsNumber: Number(current?.draftsNumber) || null,
        draftsPeriod: Number(current?.draftsPeriod) || null,
        compoundInterest: current?.compoundInterest ? 1 : 0,
        interestRatePct: this.toPercent(current?.interestRate),
        interestAmount: Number(current?.interestAmount) || 0,
      },
      { emitEvent: false }
    );
    this.recalculateDraftInterest();
    this.paymentDialogVisible = true;
    this.cdr.markForCheck();
  }

  private clearPurchaseDrafts(payload: IPurchase): void {
    payload.creditType = null;
    payload.draftDownpayment = null;
    payload.draftSerieNumber = '';
    payload.draftsNumber = null;
    payload.draftsPeriod = null;
    payload.interestAmount = null;
    payload.interestRate = null;
    payload.compoundInterest = 0;
  }

  private recalculateDraftInterest(): void {
    if (!this.paymentForm || !this.isPaymentGiros) {
      return;
    }
    const payment = this.paymentForm.getRawValue();
    const total = this.round2(Number(payment.amount) || this.grandTotal);
    const downpayment = this.round2(Number(payment.draftDownpayment) || 0);
    const draftsNumber = Number(payment.draftsNumber) || 0;
    const rate = this.fromPercent(payment.interestRatePct);
    const financed = Math.max(0, total - downpayment);
    let interest = 0;
    if (financed > 0 && draftsNumber > 0 && rate > 0) {
      interest =
        Number(payment.compoundInterest) === 1
          ? financed * (Math.pow(1 + rate, draftsNumber) - 1)
          : financed * rate * draftsNumber;
    }
    this.paymentForm.patchValue(
      { interestAmount: this.round2(interest) },
      { emitEvent: false }
    );
  }

  private continuePurchaseSave(payload: IPurchase): void {
    this.purchaseService
      .getPurchaseSaveOptions(payload.organizationId)
      .pipe(take(1))
      .subscribe((options) => {
        payload.updateInventory = options.autoInventory ? 1 : 0;
        payload.updatePrices = options.autoPrices ? 1 : 0;
        payload.priceDivisionFactor = options.divisionFactor ? 1 : 0;

        if (!options.autoInventory) {
          payload.updateInventory = window.confirm(
            '¿Desea actualizar INVENTARIOS de la mercancía incluida en esta COMPRA?'
          )
            ? 1
            : 0;
        }

        if (!options.autoPrices) {
          payload.updatePrices = window.confirm(
            '¿Desea actualizar precios según ganancia estipulada?'
          )
            ? 1
            : 0;
          if (payload.updatePrices === 1) {
            payload.priceDivisionFactor = window.confirm(
              '¿PARA ACTUALIZAR PRECIOS DESEA CALCULO DE GANANCIAS CON FACTOR DIVISION?'
            )
              ? 1
              : 0;
          }
        }

        if (payload.updateInventory !== 1) {
          this.toastService.showMyToast(
            'La mercancía de esta compra NO se actualizó en inventarios.',
            toastType.warning
          );
        }

        this.persistPurchase(payload);
      });
  }

  private startOfToday(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }

  private persistPurchase(payload: IPurchase): void {
    this.saving = true;
    this.purchaseService
      .savePurchase(payload)
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
      const row = (args.rowData ?? {}) as Partial<IPurchaseLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.createEmptyLine()
          : { ...this.createEmptyLine(), ...row };
      if (args.requestType === 'add') {
        this.lineData.billRowNumber = this.nextNumber(
          this.lines,
          (line) => line.billRowNumber
        );
      }
      this.lineMerchDiscPct = this.toPercent(this.lineData.merchandiseDiscount);
      this.lineVendorDiscPct = this.toPercent(this.lineData.vendorDiscount);
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
      Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
      args.data = { ...this.lineData };
    }
    if (args.requestType === 'delete') {
      const row = this.firstRow<IPurchaseLine>(args.data);
      if (!row?.billRowNumber) {
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
      const row = (args.rowData ?? {}) as Partial<IPurchaseDiscount>;
      this.discountData =
        args.requestType === 'add'
          ? this.createEmptyDiscount()
          : { ...this.createEmptyDiscount(), ...row };
      if (args.requestType === 'add') {
        this.discountData.billDiscountRowNumber = this.nextNumber(
          this.discounts,
          (item) => item.billDiscountRowNumber
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
      const row = this.firstRow<IPurchaseDiscount>(args.data);
      if (!row?.billDiscountRowNumber) {
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

  private patchOrder(order: IPurchase): void {
    this.currentBillId = Number(order.billId) || 0;
    this.currentOrder = order;
    this.refreshLinkedInvoice(this.currentBillId);
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
        billNumber: order.billNumber ?? '',
        issueDate,
        dueDate: this.asDate(order.dueDate) ?? issueDate,
        issueDateTax: this.asDate(order.issueDateTax) ?? issueDate,
        statusName: order.statusName ?? (this.currentBillId <= 0 ? 'Pendiente' : ''),
        providerId: Number(order.providerId) > 0 ? Number(order.providerId) : null,
        creditCash: toCreditCash(order.creditCash),
        creditTerm: Number(order.creditTerm) > 0 ? Number(order.creditTerm) : null,
        accountId: Number(order.accountId) > 0 ? Number(order.accountId) : null,
        classId: Number(order.classId) > 0 ? Number(order.classId) : null,
        warehouseId:
          Number(order.warehouseId) > 0 ? Number(order.warehouseId) : null,
        billSeriesCode: order.billSeriesCode ?? '',
        taxControlNumber: order.taxControlNumber ?? '',
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

  private lineBase(line: IPurchaseLine): number {
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
          (Number(a.billDiscountRowNumber) || 0) -
          (Number(b.billDiscountRowNumber) || 0)
      )
      .map((item) => {
        const rate = Number(item.discountRate) || 0;
        const totalDiscount = this.round2(running * rate);
        const subtotalBill = this.round2(Math.max(0, running - totalDiscount));
        running = subtotalBill;
        return {
          ...item,
          totalDiscount,
          subtotalBill,
        };
      });
    if (this.discountsGrid) {
      this.discountsGrid.dataSource = this.discounts;
    }
  }

  private previewDiscountRow(row: IPurchaseDiscount): void {
    const base = this.discountBaseBefore(row.billDiscountRowNumber);
    const rate = this.fromPercent(this.discountRatePct);
    row.discountRate = rate;
    row.totalDiscount = this.round2(base * rate);
    row.subtotalBill = this.round2(Math.max(0, base - row.totalDiscount));
  }

  private discountBaseBefore(rowNumber: number): number {
    const invoiceNet = this.linesBaseTotal();
    const previous = [...this.discounts]
      .filter(
        (item) => (Number(item.billDiscountRowNumber) || 0) < (rowNumber || 0)
      )
      .sort(
        (a, b) =>
          (Number(a.billDiscountRowNumber) || 0) -
          (Number(b.billDiscountRowNumber) || 0)
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
        (Number(a.billDiscountRowNumber) || 0) -
        (Number(b.billDiscountRowNumber) || 0)
    )[this.discounts.length - 1];
    const subtotal = Number(last?.subtotalBill);
    return Number.isFinite(subtotal)
      ? this.round2(subtotal)
      : this.linesBaseTotal();
  }

  private applyInvoiceDiscounts(amount: number): number {
    let running = this.round2(amount);
    const rows = [...this.discounts].sort(
      (a, b) =>
        (Number(a.billDiscountRowNumber) || 0) -
        (Number(b.billDiscountRowNumber) || 0)
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
          billId: this.currentBillId,
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

  private refreshTotals(order?: IPurchase): void {
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
    this.orderForm.get('taxControlNumber')?.enable({ emitEvent: false });
    this.orderForm.get('billSeriesCode')?.enable({ emitEvent: false });
    this.orderForm.get('accountId')?.enable({ emitEvent: false });
    this.orderForm.get('classId')?.enable({ emitEvent: false });
    this.orderForm.get('warehouseId')?.enable({ emitEvent: false });
    this.orderForm.get('referenceNumber')?.enable({ emitEvent: false });
    this.orderForm.get('comment')?.enable({ emitEvent: false });
    if (this.currentBillId <= 0) {
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
        (this.linesGrid?.dataSource as IPurchaseLine[]) ?? this.lines;
      this.lines = [...data];
    } else {
      const data =
        (this.discountsGrid?.dataSource as IPurchaseDiscount[]) ??
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

  private createEmptyLine(): IPurchaseLine {
    return {
      billId: this.currentBillId,
      billRowNumber: 0,
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

  private createEmptyDiscount(): IPurchaseDiscount {
    return {
      billId: this.currentBillId,
      billDiscountRowNumber: 0,
      description: '',
      discountRate: 0,
      totalDiscount: 0,
      subtotalBill: 0,
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
    this.lineData.vendorDiscount = this.fromPercent(this.lineVendorDiscPct);
    Object.assign(this.lineData, this.computeLineAmounts(this.lineData));
    this.cdr.markForCheck();
  }

  private computeLineAmounts(line: IPurchaseLine): {
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
    const host = document.getElementById('purchase-lines-grid');
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
