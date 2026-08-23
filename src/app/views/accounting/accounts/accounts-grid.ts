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
  CommandClickEventArgs,
  CommandModel,
  GridComponent,
  RecordDoubleClickEventArgs,
  RowDeselectEventArgs,
  RowSelectEventArgs,
  SearchEventArgs,
  SearchSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import {
  ClickEventArgs,
  TabComponent,
} from '@syncfusion/ej2-angular-navigations';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  fromEvent,
  map,
  shareReplay,
  startWith,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import {
  applyGridHeightAboveFooter,
  contentGridHeight,
} from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { AccountsService } from './accounts.service';
import { IAccount } from './account';

@Component({
  selector: 'llion-content',
  templateUrl: './accounts-grid.html',
  styleUrls: ['./accounts-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AccountsComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Cuentas contables');
  searchSettings?: SearchSettingsModel;
  screenHeight = contentGridHeight();

  accounts$!: Observable<IAccount[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  headerText: { text: string }[] = [{ text: 'cuenta' }];

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedAccountSubject =
    new BehaviorSubject<IAccount | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private accountsService: AccountsService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
  }

  ngOnInit(): void {
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());

    this.clearAccountSelection();

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.accounts$ = combineLatest([
      this.accountsService.accountWithCRUD$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([accounts, searchStr]) =>
        accounts.filter((account) => {
          const needle = searchStr.toLocaleLowerCase();
          return (
            (account.name ?? account.description ?? '')
              .toLocaleLowerCase()
              .includes(needle) ||
            (account.code ?? '').toLocaleLowerCase().includes(needle)
          );
        })
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.accountsService.enableAccountGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.accountsService.enableAccountFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.accountsService.enableAccountGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearAccountSelection();
  }

  onToolbarClick(args: ClickEventArgs): void {
    if (
      args.item?.id === 'gridToolbarTitle' ||
      args.item?.cssClass === 'e-grid-toolbar-title'
    ) {
      args.cancel = true;
      return;
    }

    const target = args.originalEvent.target as HTMLElement;
    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.clearAccountSelection();
      this.setAccountFormEditing(true);
      args.cancel = true;
    } else if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const account = (args.rowData ??
      this.selectedAccountSubject.value) as IAccount | null;
    if (account?.accountId) {
      this.selectAccount(account);
      this.setAccountFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar una cuenta...',
        toastType.error
      );
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title === 'Delete') {
      this.deleteSelectedAccount();
    }
  }

  private deleteSelectedAccount(): void {
    const selected = this.selectedAccountSubject.value;
    if (selected) {
      this.accountsService.deleteAccount(selected);
      this.clearAccountSelection();
      return;
    }

    this.toastService.showMyToast(
      'Debe seleccionar una cuenta...',
      toastType.error
    );
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const account = (args.data ? args.data : null) as IAccount | null;
    if (!account?.accountId) {
      return;
    }
    const previousId = this.selectedAccountSubject.value?.accountId ?? 0;
    this.selectAccount(account);
    if (previousId !== account.accountId) {
      this.setAccountFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectAccount(account: IAccount): void {
    this.selectedAccountSubject.next(account);
    this.accountsService.setAccountContext(account.accountId);
  }

  private clearAccountSelection(): void {
    this.setAccountFormEditing(false);
    this.selectedAccountSubject.next(null);
    this.accountsService.setAccountContext(0);
  }

  private setAccountFormEditing(editing: boolean): void {
    this.accountsService.enableAccountForm(editing);
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

  private updateGridHeight(): void {
    this.screenHeight = applyGridHeightAboveFooter(this.grid);
    this.cdr.markForCheck();
  }
}
