import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  GridComponent,
  SearchSettingsModel,
  SortSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { Subject, fromEvent, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, GridToolbarItem } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { AccountsService } from '../accounts.service';
import { IAccountMonthlyBalance } from '../account';

@Component({
  selector: 'llion-account-monthly-balances',
  templateUrl: './account-monthly-balances.html',
  styleUrls: ['./account-monthly-balances.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AccountMonthlyBalancesComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('monthlygrid') grid?: GridComponent;

  rows: Array<IAccountMonthlyBalance & { rowKey: string }> = [];
  toolbar: GridToolbarItem[] = withToolbarTitle(['Search'], 'Saldos mensuales');
  searchSettings: SearchSettingsModel = { operator: 'contains' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'monthNumber', direction: 'Ascending' }],
  };
  screenHeight = 320;
  gridEnabled = false;
  debitTotal = 0;
  creditTotal = 0;
  balance = 0;

  private selectedAccountId = 0;
  private allRows: IAccountMonthlyBalance[] = [];
  private selectedYear = 0;
  private searchText = '';
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

    this.accountsService.accountMonthlyBalances$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.allRows = rows ?? [];
        const years = [
          ...new Set(this.allRows.map((row) => row.fiscalYear)),
        ].sort((a, b) => b - a);
        this.selectedYear = years[0] ?? 0;
        this.applyFilter();
        this.cdr.markForCheck();
        setTimeout(() => this.updateGridHeight());
      });

    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());
  }

  ngAfterViewInit(): void {
    this.applyEnabledState(this.selectedAccountId > 0);
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

  private applyFilter(): void {
    const needle = this.searchText.toLocaleLowerCase().trim();
    this.rows = this.allRows
      .filter((row) => row.fiscalYear === this.selectedYear)
      .filter((row) => {
        if (!needle) {
          return true;
        }
        const hay = [row.monthName, row.fiscalYear?.toString()]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        return hay.includes(needle);
      })
      .sort((a, b) => a.monthNumber - b.monthNumber)
      .map((row) => ({
        ...row,
        rowKey: `${row.fiscalYear}-${row.monthNumber}`,
      }));
    this.refreshTotals();
  }

  private refreshTotals(): void {
    let debit = 0;
    let credit = 0;
    let balance = 0;
    for (const row of this.rows) {
      debit += Number(row.debits) || 0;
      credit += Number(row.credits) || 0;
      balance += Number(row.balance) || 0;
    }
    this.debitTotal = round2(debit);
    this.creditTotal = round2(credit);
    this.balance = round2(balance);
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
      this.searchText = '';
      this.applyFilter();
      return;
    }
    const searchString = document.getElementById(
      this.grid.element.id + '_searchbar'
    ) as HTMLInputElement | null;
    if (!searchString) {
      this.searchText = '';
      this.applyFilter();
      return;
    }
    if (clear) {
      searchString.value = '';
    }
    this.searchText = searchString.value || '';
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private updateGridHeight(): void {
    this.screenHeight = applyGridHeightAboveFooter(this.grid, 200, 300);
    this.cdr.markForCheck();
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
