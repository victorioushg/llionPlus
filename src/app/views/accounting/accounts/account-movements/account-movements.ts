import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DatePicker } from '@syncfusion/ej2-calendars';
import {
  FilterSettingsModel,
  GridComponent,
  IFilter,
  SearchSettingsModel,
  SortSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import {
  BehaviorSubject,
  Observable,
  Subject,
  combineLatest,
  fromEvent,
  map,
  startWith,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  bindGridSearchAsYouType,
  GridToolbarItem,
  withToolbarTitle,
} from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { AccountsService } from '../accounts.service';
import { IAccountMovement } from '../account';

@Component({
  selector: 'llion-account-movements',
  templateUrl: './account-movements.html',
  styleUrls: ['./account-movements.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AccountMovementsComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementsgrid') grid?: GridComponent;

  movements$!: Observable<IAccountMovement[]>;
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Movimientos');
  searchSettings: SearchSettingsModel = {
    operator: 'contains',
    fields: ['journalDescription', 'reference', 'movementDescription'],
  };
  textFilter: IFilter = { operator: 'contains' };
  dateFilter: IFilter = {
    ui: {
      create: (args: DateFilterCreateArgs) => this.createDateFilter(args),
      write: () => this.writeDateFilter(),
      read: () => this.readDateFilter(),
      destroy: () => this.destroyDateFilter(),
    },
  };
  filterSettings: FilterSettingsModel = {
    type: 'Menu',
    operators: {
      stringOperator: [{ value: 'contains', text: 'Contiene' }],
    },
  };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'movementDate', direction: 'Descending' }],
  };
  screenHeight = 320;
  gridEnabled = false;
  debitTotal = 0;
  creditTotal = 0;
  balance = 0;

  private selectedAccountId = 0;
  private dateFrom: Date | null = null;
  private dateTo: Date | null = null;
  private dateFilterUid = '';
  private dateFilterZIndex = 1001;
  private fromPicker?: DatePicker;
  private toPicker?: DatePicker;
  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountsService: AccountsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.accountsService.accountContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((accountId) => {
        this.selectedAccountId = accountId ?? 0;
        this.applyEnabledState(this.selectedAccountId > 0);
        this.cdr.markForCheck();
      });

    this.movements$ = combineLatest([
      this.accountsService.accountMovements$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([movements, searchStr]) => {
        const needle = (searchStr || '').toLocaleLowerCase().trim();
        if (!needle) {
          return movements;
        }
        return movements.filter((movement) =>
          this.searchHaystack(movement).includes(needle)
        );
      })
    );

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());
  }

  ngAfterViewInit(): void {
    this.applyEnabledState(this.selectedAccountId > 0);
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
  }

  ngOnDestroy(): void {
    this.destroyDateFilter();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDataBound(): void {
    this.refreshTotals();
  }

  onActionBegin(args: { requestType?: string; cancel?: boolean }): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  onActionComplete(args: { requestType?: string }): void {
    if (args.requestType !== 'filtering') {
      return;
    }
    const hasDate = (this.grid?.filterSettings.columns ?? []).some(
      (column) => column.field === 'movementDate'
    );
    if (!hasDate) {
      this.dateFrom = null;
      this.dateTo = null;
    }
    this.refreshTotals();
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

  private createDateFilter(args: DateFilterCreateArgs): void {
    this.dateFilterUid = args.column?.uid ?? 'date';
    this.dateFilterZIndex = (args.dialogObj?.zIndex ?? 1000) + 1;
    const host = document.createElement('div');
    host.style.display = 'flex';
    host.style.flexDirection = 'column';
    host.style.minWidth = '190px';
    host.append(
      this.dateField('Desde', `mov-from-${this.dateFilterUid}`),
      this.dateField('Hasta', `mov-to-${this.dateFilterUid}`)
    );
    args.target.appendChild(host);
  }

  private writeDateFilter(): void {
    const input = document.getElementById(`mov-from-${this.dateFilterUid}`);
    const operator = input
      ?.closest('.e-dialog')
      ?.querySelector('.e-flm_optrdiv') as HTMLElement | null;
    if (operator) {
      operator.style.display = 'none';
    }
    this.destroyDateFilter();
    this.fromPicker = this.mountPicker(
      `mov-from-${this.dateFilterUid}`,
      this.dateFrom
    );
    this.toPicker = this.mountPicker(`mov-to-${this.dateFilterUid}`, this.dateTo);
  }

  private readDateFilter(): void {
    const grid = this.grid;
    if (!grid) {
      return;
    }
    this.dateFrom = this.fromPicker?.value
      ? startOfDay(this.fromPicker.value)
      : null;
    this.dateTo = this.toPicker?.value ? startOfDay(this.toPicker.value) : null;
    const uid = grid.getColumnByField('movementDate')?.uid;
    const columns = (grid.filterSettings.columns ?? []).filter(
      (column) => column.field !== 'movementDate'
    );
    if (this.dateFrom) {
      columns.push({
        field: 'movementDate',
        operator: 'greaterthanorequal',
        predicate: 'and',
        value: this.dateFrom,
        type: 'date',
        matchCase: true,
        uid,
      });
    }
    if (this.dateTo) {
      columns.push({
        field: 'movementDate',
        operator: 'lessthan',
        predicate: 'and',
        value: nextDay(this.dateTo),
        type: 'date',
        matchCase: true,
        uid,
      });
    }
    setTimeout(() => {
      if (!this.grid) {
        return;
      }
      this.grid.filterSettings.columns = columns;
      this.grid.dataBind();
    });
  }

  private destroyDateFilter(): void {
    this.fromPicker?.destroy();
    this.toPicker?.destroy();
    this.fromPicker = undefined;
    this.toPicker = undefined;
  }

  private dateField(label: string, id: string): HTMLElement {
    const field = document.createElement('label');
    field.style.display = 'flex';
    field.style.flexDirection = 'column';
    field.style.gap = '4px';
    field.style.marginBottom = '8px';
    const caption = document.createElement('span');
    caption.textContent = label;
    const input = document.createElement('input');
    input.id = id;
    input.className = 'e-flmenu-input';
    field.append(caption, input);
    return field;
  }

  private mountPicker(id: string, value: Date | null): DatePicker {
    const picker = new DatePicker({
      format: 'dd/MM/yyyy',
      value: value ?? undefined,
      width: '100%',
      open: (event: { popup: { element: HTMLElement } }) => {
        event.popup.element.style.zIndex = String(this.dateFilterZIndex);
      },
    });
    picker.appendTo(`#${id}`);
    return picker;
  }

  private refreshTotals(): void {
    const rows = (this.grid?.getCurrentViewRecords() ?? []) as IAccountMovement[];
    let debit = 0;
    let credit = 0;
    for (const row of rows) {
      const amount = Number(row.amount) || 0;
      if (amount >= 0) {
        debit += amount;
      } else {
        credit += Math.abs(amount);
      }
    }
    this.debitTotal = round2(debit);
    this.creditTotal = round2(credit);
    this.balance = round2(debit - credit);
    this.cdr.markForCheck();
  }

  private applyEnabledState(enabled: boolean): void {
    this.gridEnabled = enabled;
    setTimeout(() => {
      if (!this.grid?.element) {
        return;
      }
      this.grid.element.classList.toggle('disablegrid', !enabled);
      this.cdr.markForCheck();
    });
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

  private searchHaystack(movement: IAccountMovement): string {
    return [
      movement.journalDescription,
      movement.reference,
      movement.movementDescription,
      movement.accountCode,
      movement.amount?.toString(),
      formatDate(movement.movementDate),
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
  }

  private updateGridHeight(): void {
    this.screenHeight = applyGridHeightAboveFooter(this.grid, 200, 300);
    this.cdr.markForCheck();
  }
}

interface DateFilterCreateArgs {
  target: HTMLElement;
  column?: { uid?: string };
  dialogObj?: { zIndex?: number };
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function nextDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}
