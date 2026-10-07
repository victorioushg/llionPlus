import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  SearchSettingsModel,
  SortSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import {
  BehaviorSubject,
  Subject,
  fromEvent,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { toastType } from '@shared/enums/enums';
import { ToastService } from '@shared/services/toastService';
import { withToolbarTitle, GridToolbarItem } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { TreasuryService } from '../treasury.service';
import {
  IBankMovementTotals,
  ICashMovementTotals,
  ITreasuryMovement,
  TREASURY_BANK_DEPOSIT_TYPES,
  TREASURY_BANK_MOVEMENT_TYPES,
  TREASURY_CASH_MOVEMENT_TYPES,
  TREASURY_CASH_PAYMENT_TYPES,
  TREASURY_TYPE_CASHBOX,
} from '../treasury';
import { OrganizationService } from '@views/application/organization/organization.service';
import { ProviderService } from '@views/provider/provider.service';
import { IProvider } from '@views/provider/provider';

@Component({
  selector: 'llion-treasury-movements',
  templateUrl: './treasury-movements.html',
  styleUrls: ['./treasury-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TreasuryMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;
  @ViewChild('movementForm') movementForm?: NgForm;

  movements: ITreasuryMovement[] = [];
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'movementDate', direction: 'Descending' }],
  };
  screenHeight = 320;
  gridEnabled = false;
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  movementTypes = TREASURY_BANK_MOVEMENT_TYPES;
  depositTypes = TREASURY_BANK_DEPOSIT_TYPES;
  paymentTypes = TREASURY_CASH_PAYMENT_TYPES;
  currencies: { code: string; description: string }[] = [
    { code: '0', description: '0' },
  ];
  bankCurrency = '0';
  providers: IProvider[] = [];
  providerFields: Object = { text: 'description', value: 'providerId' };
  movementTypeFields: Object = { text: 'description', value: 'code' };
  documentAttrs = { maxlength: '15' };
  paymentDocAttrs = { maxlength: '25' };
  cashHint = 'Indique el número de documento para este movimiento ...';
  movementData: ITreasuryMovement = this.createEmptyMovement();
  isCashBox = false;
  cashTotals: ICashMovementTotals = this.emptyCashTotals();
  bankTotals: IBankMovementTotals = this.emptyBankTotals();

  private selectedTreasuryId = 0;
  private organizationId = 0;
  private defaultOrigin = 'BAN';
  private defaultMovementType = 'DP';
  private toolbarTitle = 'Movimientos';
  private readonly chunkSize = 200;
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();
  private tabVisible = false;
  private searchText = '';
  private beforeDate: string | null = null;
  private beforeId: number | null = null;
  private loadingChunk = false;
  private noMoreRows = false;
  private loadGeneration = 0;
  private contentEl: HTMLElement | null = null;

  constructor(
    private treasuryService: TreasuryService,
    private organizationService: OrganizationService,
    private providerService: ProviderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.organizationId = this.treasuryService.currentOrganizationId;
    this.organizationService.currencies$
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((rows) => {
        const currencies = (rows ?? [])
          .map((row) => ({
            code: row.alphabeticCode,
            description: row.alphabeticCode,
          }))
          .filter((row) => !!row.code);
        if (currencies.length > 0) {
          this.currencies = currencies;
          if (!this.bankCurrency || this.bankCurrency === '0') {
            this.bankCurrency = currencies[0].code;
          }
          this.cdr.markForCheck();
        }
      });

    this.providerService.providers$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.providers = (rows ?? []).filter((row) => !row.deactivated);
        this.cdr.markForCheck();
      });

    this.treasuryService.treasuryTypeFilterAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((type) => {
        const isCash = type === TREASURY_TYPE_CASHBOX;
        this.isCashBox = isCash;
        this.defaultOrigin = isCash ? 'CAJ' : 'BAN';
        this.defaultMovementType = isCash ? 'EN' : 'DP';
        this.movementTypes = isCash
          ? TREASURY_CASH_MOVEMENT_TYPES
          : TREASURY_BANK_MOVEMENT_TYPES;
        this.toolbarTitle = isCash
          ? 'Movimientos de caja'
          : 'Movimientos de banco';
        this.applyEditState(this.selectedTreasuryId > 0);
        if (isCash) {
          this.bankTotals = this.emptyBankTotals();
        } else {
          this.cashTotals = this.emptyCashTotals();
        }
        setTimeout(() => {
          this.grid?.refreshColumns();
          this.updateGridHeight();
        });
        this.cdr.markForCheck();
      });

    this.treasuryService.treasuryContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((treasuryId) => {
        this.selectedTreasuryId = treasuryId ?? 0;
        this.organizationId = this.treasuryService.currentOrganizationId;
        this.applyEditState(this.selectedTreasuryId > 0);
        this.reloadMovements();
        this.cdr.markForCheck();
      });

    this.searchStringSubject
      .pipe(debounceTime(250), takeUntil(this.destroy$))
      .subscribe((value) => {
        const next = (value || '').trim();
        if (next === this.searchText) {
          return;
        }
        this.searchText = next;
        this.reloadMovements();
      });

    this.treasuryService.movementsChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.reloadMovements());

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());

    this.treasuryService.movementsVisible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tabVisible = true;
        this.reloadMovements();
        setTimeout(() => {
          this.grid?.refresh();
          this.updateGridHeight();
          this.bindContentScroll();
        }, 0);
      });
  }

  ngAfterViewInit(): void {
    this.applyEditState(this.selectedTreasuryId > 0);
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onToolbarClick(args: ClickEventArgs): void {
    if (
      args.item?.id === 'gridToolbarTitle' ||
      args.item?.cssClass === 'e-grid-toolbar-title'
    ) {
      args.cancel = true;
      return;
    }

    const target = args.originalEvent?.target as HTMLElement | undefined;
    const targetId =
      !target || target.id === ''
        ? target?.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  actionBegin(args: SaveEventArgs): void {
    if (args.requestType === 'beginEdit') {
      args.cancel = true;
      return;
    }

    const needsSelection =
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsSelection && this.selectedTreasuryId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        this.defaultOrigin === 'CAJ'
          ? 'Debe seleccionar una caja para gestionar movimientos'
          : 'Debe seleccionar un banco para gestionar movimientos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'add') {
      this.cashHint =
        'Indique el número de documento para este movimiento ...';
      this.movementData = {
        ...this.createEmptyMovement(),
        treasuryId: this.selectedTreasuryId,
        organizationId: this.organizationId,
        movementId: 0,
        fiscalPeriod: null,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      const hint = this.isCashBox
        ? this.validateCashMovement()
        : this.validateBankMovement();
      if (hint) {
        args.cancel = true;
        this.setCashHint(hint);
        this.toastService.showMyToast(hint, toastType.warning);
        return;
      }

      const movementDate = this.asDate(this.movementData.movementDate);
      const payload: ITreasuryMovement = {
        ...this.movementData,
        movementId: 0,
        treasuryId: this.selectedTreasuryId,
        organizationId: this.organizationId,
        movementDate,
        amount: this.signedAmount(),
        paymentType: this.isCashBox
          ? (this.movementData.paymentType || 'EF').trim().toUpperCase()
          : this.movementData.paymentType,
        paymentReceipt: (this.movementData.paymentReceipt || '').trim(),
        paymentReference: (this.movementData.paymentReference || '').trim(),
        movementDocument: (this.movementData.movementDocument || '').trim(),
        concept: (this.movementData.concept || '').trim(),
        beneficiary: (this.movementData.beneficiary || '').trim(),
        originType: this.isCashBox
          ? this.movementData.originType
          : this.movementData.originType || 'NM',
        fiscalPeriod: this.movementData.fiscalPeriod ?? null,
        reconciled: !!this.movementData.reconciled,
        batchCancellation: !!this.movementData.batchCancellation,
      };
      args.data = payload;

      this.treasuryService
        .addMovement(payload)
        .pipe(take(1))
        .subscribe({
          error: () => {
            args.cancel = true;
          },
        });
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as ITreasuryMovement;
      if (row.movementId > 0 && row.treasuryId > 0) {
        this.treasuryService
          .deleteMovement(row.movementId, row.treasuryId)
          .pipe(take(1))
          .subscribe({
            error: () => {
              args.cancel = true;
            },
          });
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'add') {
      const dialog = args.dialog as
        | {
            header?: string;
            width?: string | number;
            cssClass?: string;
          }
        | undefined;
      const element = (dialog as { element?: HTMLElement } | undefined)?.element;
      if (dialog) {
        dialog.header = this.isCashBox
          ? 'Movimiento de caja'
          : 'Movimiento bancario';
        if (element) {
          element.classList.add('treasury-movement-dialog');
          element.classList.toggle('show-dialog-footer', this.isCashBox);
          element.classList.toggle('cash-dialog', this.isCashBox);
          element.style.width = this.isCashBox ? '560px' : '720px';
        }
        if (this.isCashBox) {
          const buttons = (
            dialog as {
              buttons?: { buttonModel?: { content?: string; isPrimary?: boolean } }[];
            }
          ).buttons;
          buttons?.forEach((button) => {
            const model = button.buttonModel;
            if (!model) {
              return;
            }
            model.content = model.isPrimary ? 'Aceptar' : 'Cancelar';
            (model as { iconCss?: string }).iconCss = '';
          });
        }
      }

      setTimeout(() => {
        if (this.isCashBox && element) {
          const footer = element.querySelector(
            '.e-footer-content'
          ) as HTMLElement | null;
          const hint = element.querySelector(
            '.cash-movement-footer'
          ) as HTMLElement | null;
          if (footer && hint && hint.parentElement !== footer) {
            footer.prepend(hint);
          }
          element
            .querySelectorAll('.e-footer-content .e-btn')
            .forEach((button) => {
              const label = button.classList.contains('e-primary')
                ? 'Aceptar'
                : 'Cancelar';
              button.querySelectorAll('.e-btn-icon').forEach((icon) => icon.remove());
              const text = button.querySelector('.e-btn-text');
              if (text) {
                text.textContent = label;
              }
            });
        }
        const form = args.form as HTMLFormElement | undefined;
        const field = form?.elements.namedItem(
          'movementDocument'
        ) as HTMLInputElement | null;
        field?.focus();
      });
    }
  }

  setCashHint(message: string): void {
    this.cashHint = message;
    this.cdr.detectChanges();
  }

  onBeneficiaryChange(providerId: number | null): void {
    const id = Number(providerId) || 0;
    const provider = this.providers.find((row) => row.providerId === id);
    this.movementData.customer_Provider = provider?.providerId ?? null;
    this.movementData.beneficiary = provider?.description ?? '';
  }

  acceptCashMovement(): void {
    this.grid?.endEdit();
  }

  cancelCashMovement(): void {
    this.grid?.closeEdit();
  }

  private applyEditState(enabled: boolean): void {
    this.gridEnabled = enabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Delete', 'Search'] : ['Search'],
      this.toolbarTitle
    );
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: false,
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

  private createEmptyMovement(): ITreasuryMovement {
    const today = new Date();
    return {
      movementId: 0,
      treasuryId: this.selectedTreasuryId,
      movementDate: today,
      movementDocument: '',
      movementType: this.defaultMovementType,
      concept: '',
      amount: 0,
      origin: this.defaultOrigin,
      originDocument: '',
      originDocumentId: null,
      originType: this.defaultOrigin === 'BAN' ? 'NM' : '',
      beneficiary: '',
      paymentType: this.defaultOrigin === 'CAJ' ? 'EF' : null,
      paymentReceipt: '',
      paymentReference: '',
      reconciled: false,
      reconciledMonth: null,
      reconciledDate: null,
      batchCancellation: false,
      journalEntryNumber: '',
      journalEntryDate: '',
      customer_Provider: null,
      salesPersonId: null,
      accountId: null,
      classId: null,
      lock_Date: null,
      fiscalPeriod: null,
      organizationId: this.organizationId,
    };
  }

  private validateCashMovement(): string | null {
    if (!this.movementData.movementDate) {
      return 'Indique la fecha de este movimiento ...';
    }

    const documentNumber = (this.movementData.movementDocument || '').trim();
    if (!documentNumber) {
      return 'Debe indicar un número de documento válido ...';
    }

    const paymentType = (this.movementData.paymentType || 'EF')
      .trim()
      .toUpperCase();
    const paymentDocument = (this.movementData.paymentReceipt || '').trim();
    const paymentReference = (this.movementData.paymentReference || '').trim();
    if (paymentType !== 'EF' && !paymentDocument) {
      return 'Debe indicar un número de pago válido ...';
    }
    if (paymentType !== 'EF' && !paymentReference) {
      return 'Debe indicar una referencia de pago válida ...';
    }
    if (
      (this.movementData.movementType || '').trim().toUpperCase() === 'SA' &&
      paymentType !== 'EF'
    ) {
      return 'Una salida de caja sólo puede ser en efectivo ...';
    }

    const amount = this.movementData.amount;
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return 'El importe debe ser numérico ...';
    }
    return null;
  }

  private validateBankMovement(): string | null {
    if (!this.movementData.movementDate) {
      return 'Indique la fecha de este movimiento ...';
    }

    const documentNumber = (this.movementData.movementDocument || '').trim();
    if (!documentNumber) {
      return 'Debe indicar un número de documento válido ...';
    }

    if (!(this.movementData.concept || '').trim()) {
      return 'Debe indicar un concepto ó comentario válido ...';
    }

    const movementType = (this.movementData.movementType || '')
      .trim()
      .toUpperCase();
    if (movementType === 'CH' && !(this.movementData.beneficiary || '').trim()) {
      return 'Debe indicar un nombre de beneficiario ...';
    }

    const amount = this.movementData.amount;
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
      return 'El importe debe ser numérico ...';
    }
    return null;
  }

  private signedAmount(): number | null {
    const raw = this.movementData.amount;
    if (raw === null || raw === undefined) {
      return null;
    }
    const value = Number(raw);
    if (Number.isNaN(value)) {
      return null;
    }
    const absolute = Math.abs(value);
    const movementType = (this.movementData.movementType || '').trim().toUpperCase();
    if (this.isCashBox) {
      return movementType === 'SA' ? -absolute : absolute;
    }
    return movementType === 'CH' || movementType === 'ND' ? -absolute : absolute;
  }

  private asDate(value: Date | string | null | undefined): Date {
    if (value instanceof Date) {
      return value;
    }
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private search(clear: boolean = false): void {
    if (!this.grid?.element?.id) {
      this.searchStringSubject.next('');
      return;
    }
    const searchString = document.getElementById(
      this.grid.element.id + '_searchbar'
    ) as HTMLInputElement | null;
    if (!searchString) {
      this.searchStringSubject.next('');
      return;
    }
    if (clear) {
      searchString.value = '';
    }
    this.searchStringSubject.next(searchString.value || '');
  }

  private reloadMovements(): void {
    this.loadGeneration++;
    this.movements = [];
    this.noMoreRows = false;
    this.loadingChunk = false;
    this.beforeDate = null;
    this.beforeId = null;
    this.contentEl = null;
    this.cdr.markForCheck();
    this.loadMovementTotals();
    if (!this.tabVisible || this.selectedTreasuryId <= 0) {
      return;
    }
    this.fetchNextChunk();
  }

  private emptyCashTotals(): ICashMovementTotals {
    return {
      cashAmount: 0,
      checkAmount: 0,
      cardAmount: 0,
      voucherAmount: 0,
      totalAmount: 0,
    };
  }

  private emptyBankTotals(): IBankMovementTotals {
    return {
      depositAmount: 0,
      creditNoteAmount: 0,
      debitNoteAmount: 0,
      checkAmount: 0,
      totalAmount: 0,
    };
  }

  private loadMovementTotals(): void {
    if (this.isCashBox) {
      this.loadCashTotals();
      return;
    }
    this.loadBankTotals();
  }

  private loadCashTotals(): void {
    if (
      !this.isCashBox ||
      !this.tabVisible ||
      this.selectedTreasuryId <= 0 ||
      this.organizationId <= 0
    ) {
      this.cashTotals = this.emptyCashTotals();
      return;
    }

    const generation = this.loadGeneration;
    this.treasuryService
      .getCashMovementTotals(this.selectedTreasuryId, this.organizationId)
      .pipe(take(1))
      .subscribe((totals) => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.cashTotals = totals;
        this.cdr.markForCheck();
        setTimeout(() => this.updateGridHeight());
      });
  }

  private loadBankTotals(): void {
    if (
      this.isCashBox ||
      !this.tabVisible ||
      this.selectedTreasuryId <= 0 ||
      this.organizationId <= 0
    ) {
      this.bankTotals = this.emptyBankTotals();
      return;
    }

    const generation = this.loadGeneration;
    this.treasuryService
      .getBankMovementTotals(this.selectedTreasuryId, this.organizationId)
      .pipe(take(1))
      .subscribe((totals) => {
        if (generation !== this.loadGeneration) {
          return;
        }
        this.bankTotals = totals;
        this.cdr.markForCheck();
        setTimeout(() => this.updateGridHeight());
      });
  }

  private fetchNextChunk(): void {
    if (
      this.loadingChunk ||
      this.noMoreRows ||
      !this.tabVisible ||
      this.selectedTreasuryId <= 0
    ) {
      return;
    }

    const generation = this.loadGeneration;
    this.organizationId = this.treasuryService.currentOrganizationId;
    if (this.organizationId <= 0) {
      return;
    }
    this.loadingChunk = true;
    this.treasuryService
      .getTreasuryMovementPage(
        this.selectedTreasuryId,
        this.organizationId,
        this.chunkSize,
        this.beforeDate,
        this.beforeId,
        this.searchText
      )
      .pipe(take(1))
      .subscribe({
        next: (rows) => {
          if (generation !== this.loadGeneration) {
            return;
          }
          const page = rows ?? [];
          this.movements = [...this.movements, ...page];
          if (page.length < this.chunkSize) {
            this.noMoreRows = true;
          } else {
            const last = page[page.length - 1];
            this.beforeDate = this.asDateKey(last.movementDate);
            this.beforeId = last.movementId;
          }
          this.loadingChunk = false;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.bindContentScroll();
            this.fillIfShort();
          }, 0);
        },
        error: () => {
          if (generation !== this.loadGeneration) {
            return;
          }
          this.loadingChunk = false;
          this.cdr.markForCheck();
        },
      });
  }

  private bindContentScroll(): void {
    const content = this.grid?.element?.querySelector(
      '.e-content'
    ) as HTMLElement | null;
    if (!content || content === this.contentEl) {
      return;
    }
    this.contentEl = content;
    fromEvent(content, 'scroll')
      .pipe(debounceTime(80), takeUntil(this.destroy$))
      .subscribe(() => {
        if (
          content.scrollHeight - content.scrollTop - content.clientHeight <
          160
        ) {
          this.fetchNextChunk();
        }
      });
  }

  private fillIfShort(): void {
    const content = this.contentEl;
    if (!content || this.noMoreRows || this.loadingChunk) {
      return;
    }
    if (content.clientHeight < 40) {
      return;
    }
    if (content.scrollHeight <= content.clientHeight + 4) {
      this.fetchNextChunk();
    }
  }

  private asDateKey(value: Date | string): string {
    if (typeof value === 'string') {
      return value.slice(0, 10);
    }
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }

  private updateGridHeight(): void {
    // Wait until the treasury grid has applied its own height.
    setTimeout(() => this.alignBottomToTreasuryGrid());
  }

  /** Content height so this grid's bottom lines up with the treasury list. */
  private alignBottomToTreasuryGrid(): void {
    const height = this.heightAlignedWithTreasury();
    this.screenHeight = height;
    if (this.grid) {
      this.grid.height = height;
    }
    this.cdr.markForCheck();
  }

  private heightAlignedWithTreasury(): number {
    const treasuryGrid = document.querySelector(
      '#treasury-grid .e-grid'
    ) as HTMLElement | null;
    const movementsGrid = this.grid?.element;
    if (!treasuryGrid || !movementsGrid) {
      return applyGridHeightAboveFooter(this.grid);
    }

    const treasuryBottom = treasuryGrid.getBoundingClientRect().bottom;
    const movementsTop = movementsGrid.getBoundingClientRect().top;
    if (treasuryBottom <= 0 || movementsTop <= 0) {
      return applyGridHeightAboveFooter(this.grid);
    }

    const content = movementsGrid.querySelector('.e-content') as HTMLElement | null;
    const chrome = Math.max(
      0,
      movementsGrid.offsetHeight - (content?.offsetHeight ?? 0)
    );
    const totals = movementsGrid.parentElement?.querySelector(
      '.cash-totals'
    ) as HTMLElement | null;
    const totalsHeight = totals?.offsetHeight ?? 0;
    return Math.max(
      120,
      Math.floor(treasuryBottom - movementsTop - chrome - totalsHeight)
    );
  }
}
