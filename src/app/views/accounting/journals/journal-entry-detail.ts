import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import {
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
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { JournalEntryService } from './journal-entry.service';
import {
  IJournalEntry,
  IJournalEntryAccount,
  IJournalEntryLine,
  isJournalEntryLocked,
  journalLineDisplay,
} from './journal-entry';

@Component({
  selector: 'llion-journal-entry-detail',
  templateUrl: './journal-entry-detail.html',
  styleUrls: ['./journal-entry-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class JournalEntryDetailComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;

  headerForm!: FormGroup;
  entry$!: Observable<IJournalEntry>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  accounts$!: Observable<IJournalEntryAccount[]>;
  accountFields = { text: 'displayName', value: 'accountId' };
  filterType: 'Contains' = 'Contains';

  lines: IJournalEntryLine[] = [];
  lineData!: IJournalEntryLine;
  currentEntryId = 0;
  currentTemplateOriginId: number | null = null;
  currentLockDate: Date | string | null = null;
  debitTotal = 0;
  creditTotal = 0;
  balance = 0;
  unbalanced = false;
  linesHeight = 220;
  gridEnabled = false;
  saving = false;

  private accounts: IJournalEntryAccount[] = [];
  private currentEntry: IJournalEntry | null = null;
  private readonly destroy$ = new Subject<void>();

  linesToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete'],
    'Renglones'
  ) as ToolbarItems[];
  linesEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
    allowEditOnDblClick: true,
    showDeleteConfirmDialog: true,
  };

  constructor(
    private formBuilder: FormBuilder,
    private journalEntryService: JournalEntryService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    this.lineData = this.journalEntryService.emptyLine();
  }

  ngOnInit(): void {
    this.headerForm = this.formBuilder.group({
      journalEntryCode: [{ value: '', disabled: true }],
      journalEntryDate: [null as Date | null, Validators.required],
      description: [''],
      actual: [{ value: false, disabled: true }],
      periodLabel: [{ value: 'Periodo Actual', disabled: true }],
      lockDate: [{ value: null as Date | null, disabled: true }],
    });
    this.headerForm.disable({ emitEvent: false });

    this.enabled$ = this.journalEntryService.enableFormAction$.pipe(
      shareReplay(1)
    );
    this.entry$ = this.journalEntryService.journalEntrySelected$;
    this.accounts$ = this.journalEntryService.accounts$;
    this.accounts$.pipe(takeUntil(this.destroy$)).subscribe((rows) => {
      this.accounts = rows ?? [];
      this.cdr.markForCheck();
    });

    this.visible$ = combineLatest([this.enabled$, this.entry$]).pipe(
      map(([editing, entry]) => editing || (entry?.journalEntryId ?? 0) > 0)
    );

    this.entry$.pipe(takeUntil(this.destroy$)).subscribe((entry) => {
      this.patchEntry(entry);
      this.cdr.markForCheck();
      setTimeout(() => this.updateLinesHeight());
    });

    this.enabled$.pipe(takeUntil(this.destroy$)).subscribe((enabled) => {
      this.gridEnabled = enabled;
      this.applyFormEnabled(enabled);
      this.applyEditState(enabled);
      this.cdr.markForCheck();
    });

  }

  get canPromote(): boolean {
    const actual = !!this.headerForm?.get('actual')?.value;
    return (
      this.gridEnabled &&
      !actual &&
      !this.unbalanced &&
      this.lines.length > 0 &&
      !isJournalEntryLocked(this.currentEntry)
    );
  }

  get actualLabel(): string {
    return this.headerForm?.get('actual')?.value
      ? 'Asiento actual'
      : 'Asiento diferido';
  }

  promoteToActual(): void {
    if (!this.canPromote) {
      this.recalculateTotals();
      if (this.unbalanced) {
        this.toastService.showMyToast(
          'Para pasar el asiento a actual el balance debe ser cero',
          toastType.warning
        );
      }
      return;
    }
    this.headerForm.get('actual')?.setValue(true, { emitEvent: false });
    this.cdr.markForCheck();
  }

  ngAfterViewInit(): void {
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateLinesHeight());
    setTimeout(() => this.updateLinesHeight());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelClick(): void {
    this.journalEntryService.cancelEdit();
  }

  onAcceptClick(): void {
    if (!this.gridEnabled || this.saving) {
      return;
    }
    if (this.headerForm.invalid) {
      this.headerForm.markAllAsTouched();
      this.toastService.showMyToast(
        'Indique la fecha del asiento',
        toastType.warning
      );
      return;
    }
    if (this.lines.length === 0) {
      this.toastService.showMyToast(
        'Indique al menos un renglón',
        toastType.warning
      );
      return;
    }
    this.recalculateTotals();
    if (this.unbalanced) {
      this.toastService.showMyToast(
        'El asiento debe cuadrar: Debe y Haber tienen que ser iguales',
        toastType.warning
      );
      return;
    }

    const form = this.headerForm.getRawValue();
    const payload: IJournalEntry = {
      ...(this.currentEntry ?? this.journalEntryService.createEmptyJournalEntry()),
      journalEntryId: this.currentEntryId,
      journalEntryCode: String(form.journalEntryCode ?? '').trim(),
      journalEntryDate: form.journalEntryDate,
      description: form.description ?? '',
      actual: !!form.actual,
      entryKind: form.actual ? 'Actual' : 'Diferido',
      templateOriginId: this.currentTemplateOriginId,
      lockDate: this.currentLockDate,
      fiscalPeriod: this.currentEntry?.fiscalPeriod ?? null,
      fiscalPeriodName: form.periodLabel,
      organizationId:
        this.currentEntry?.organizationId ||
        this.journalEntryService.currentOrganizationId,
      debits: this.debitTotal,
      credits: this.creditTotal,
      lines: this.lines.map((line, index) => this.serializeLine(line, index)),
    };

    this.saving = true;
    this.journalEntryService
      .saveJournalEntry(payload)
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

  onLineActionBegin(args: SaveEventArgs): void {
    if (!this.gridEnabled) {
      args.cancel = true;
      return;
    }
    if (args.requestType === 'add' || args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IJournalEntryLine>;
      this.lineData =
        args.requestType === 'add'
          ? this.journalEntryService.emptyLine(this.nextRowNumber())
          : { ...this.journalEntryService.emptyLine(), ...row };
    }
    if (args.requestType === 'save') {
      if (!this.lineForm?.valid) {
        args.cancel = true;
        return;
      }
      if (!(Number(this.lineData.accountId) > 0)) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Seleccione una cuenta',
          toastType.warning
        );
        return;
      }
      const debit = this.round2(Number(this.lineData.debit) || 0);
      const credit = this.round2(Number(this.lineData.credit) || 0);
      if (debit <= 0 && credit <= 0) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Indique un importe en Debe o en Haber',
          toastType.warning
        );
        return;
      }
      if (debit > 0 && credit > 0) {
        args.cancel = true;
        this.toastService.showMyToast(
          'El renglón no puede tener Debe y Haber a la vez',
          toastType.warning
        );
        return;
      }
      this.applyLineAmounts(debit, credit);
      args.data = { ...this.lineData };
    }
  }

  onLineActionComplete(args: SaveEventArgs): void {
    if (args.requestType === 'save') {
      const next = [...this.lines];
      const index = next.findIndex(
        (row) => row.rowNumber === this.lineData.rowNumber
      );
      if (index >= 0) {
        next[index] = { ...this.lineData };
      } else {
        next.push({ ...this.lineData });
      }
      this.lines = next;
      this.recalculateTotals();
      this.cdr.markForCheck();
    }
    if (args.requestType === 'delete') {
      const deleted = Array.isArray(args.data)
        ? (args.data as IJournalEntryLine[])
        : [args.data as IJournalEntryLine];
      const ids = new Set(deleted.map((row) => row?.rowNumber));
      this.lines = this.lines.filter((row) => !ids.has(row.rowNumber));
      this.recalculateTotals();
      this.cdr.markForCheck();
    }
  }

  onAccountChange(args: ChangeEventArgs): void {
    const account = this.accounts.find((row) => row.accountId === args.value);
    if (!account) {
      this.lineData.accountCode = '';
      this.lineData.accountName = '';
      this.lineData.accountDisplay = '';
      return;
    }
    this.lineData.accountId = account.accountId;
    this.lineData.accountCode = account.code;
    this.lineData.accountName = account.name;
    this.lineData.accountDisplay = account.displayName;
  }

  onDebitChange(): void {
    const debit = Number(this.lineData.debit) || 0;
    if (debit > 0) {
      this.lineData.credit = 0;
    }
  }

  onCreditChange(): void {
    const credit = Number(this.lineData.credit) || 0;
    if (credit > 0) {
      this.lineData.debit = 0;
    }
  }

  private patchEntry(entry: IJournalEntry): void {
    this.currentEntry = entry;
    this.currentEntryId = entry.journalEntryId ?? 0;
    this.currentTemplateOriginId = entry.templateOriginId ?? null;
    this.currentLockDate = entry.lockDate ?? null;
    const date = this.asDate(entry.journalEntryDate);
    const lockDate = this.asDate(entry.lockDate);
    this.headerForm.patchValue(
      {
        journalEntryCode: entry.journalEntryCode ?? '',
        journalEntryDate: date,
        description: entry.description ?? '',
        actual: !!entry.actual,
        periodLabel: entry.fiscalPeriod
          ? entry.fiscalPeriodName || 'Periodo Actual'
          : 'Periodo Actual',
        lockDate,
      },
      { emitEvent: false }
    );
    this.lines = [...(entry.lines ?? [])].map((line) => ({
      ...line,
      accountDisplay: line.accountDisplay || journalLineDisplay(line),
    }));
    this.recalculateTotals();
  }

  private applyFormEnabled(enabled: boolean): void {
    if (enabled && !isJournalEntryLocked(this.currentEntry)) {
      this.headerForm.enable({ emitEvent: false });
    } else {
      this.headerForm.disable({ emitEvent: false });
    }
    this.headerForm.get('journalEntryCode')?.disable({ emitEvent: false });
    this.headerForm.get('actual')?.disable({ emitEvent: false });
    this.headerForm.get('periodLabel')?.disable({ emitEvent: false });
    this.headerForm.get('lockDate')?.disable({ emitEvent: false });
  }

  private applyEditState(enabled: boolean): void {
    const canEdit = enabled && !isJournalEntryLocked(this.currentEntry);
    this.linesEditSettings = {
      ...this.linesEditSettings,
      allowAdding: canEdit,
      allowEditing: canEdit,
      allowDeleting: canEdit,
    };
  }

  private serializeLine(line: IJournalEntryLine, index: number): IJournalEntryLine {
    const debit = this.round2(Number(line.debit) || 0);
    const credit = this.round2(Number(line.credit) || 0);
    const debitCredit = debit > 0 ? 1 : 0;
    const amount = debit > 0 ? debit : credit;
    return {
      ...line,
      journalEntryId: this.currentEntryId,
      rowNumber: line.rowNumber || index + 1,
      debitCredit,
      amount,
      debit,
      credit,
      organizationId:
        line.organizationId || this.journalEntryService.currentOrganizationId,
    };
  }

  private applyLineAmounts(debit: number, credit: number): void {
    this.lineData.debit = debit;
    this.lineData.credit = credit;
    this.lineData.debitCredit = debit > 0 ? 1 : 0;
    this.lineData.amount = debit > 0 ? debit : credit;
    this.lineData.accountDisplay = journalLineDisplay(this.lineData);
  }

  private recalculateTotals(): void {
    const debit = this.round2(
      this.lines.reduce(
        (sum, line) => sum + Math.abs(Number(line.debit) || 0),
        0
      )
    );
    const credit = this.round2(
      this.lines.reduce(
        (sum, line) => sum + Math.abs(Number(line.credit) || 0),
        0
      )
    );
    this.debitTotal = debit;
    this.creditTotal = this.round2(-credit);
    this.balance = this.round2(this.debitTotal + this.creditTotal);
    this.unbalanced = Math.abs(this.balance) > 0.009;
  }

  private nextRowNumber(): number {
    return (
      this.lines.reduce(
        (max, line) => Math.max(max, Number(line.rowNumber) || 0),
        0
      ) + 1
    );
  }

  private updateLinesHeight(): void {
    const host = document.getElementById('journal-entry-lines-grid');
    const wrapper = host?.parentElement;
    if (!host || !wrapper || wrapper.clientHeight <= 0) {
      return;
    }

    const reserved = Array.from(wrapper.children)
      .filter((child) => child !== host)
      .reduce((sum, child) => sum + this.outerHeight(child), 0);
    const hostHeight = Math.max(80, Math.floor(wrapper.clientHeight - reserved));
    const toolbarHeight =
      (host.querySelector('.e-toolbar') as HTMLElement | null)?.offsetHeight ??
      0;
    const height = Math.max(80, hostHeight - toolbarHeight - 8);
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

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private round2(value: number): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }
}
