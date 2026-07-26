import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
  map,
  shareReplay,
  startWith,
  takeUntil,
} from 'rxjs';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { CustomerService } from './customer.service';
import { ICustomer } from './customer';

@Component({
  selector: 'llion-content',
  templateUrl: './customer-grid.html',
  styleUrls: ['./customer-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CustomerComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Clientes');
  searchSettings?: SearchSettingsModel;

  customers$!: Observable<ICustomer[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;
  entityTypeId = 0;

  headerText: { text: string }[] = [{ text: 'cliente' }];

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedCustomerSubject =
    new BehaviorSubject<ICustomer | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private applicationService: ApplicationService,
    private customerService: CustomerService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
    this.clearCustomerSelection();

    this.applicationService
      .getEntityId('Customer')
      .pipe(takeUntil(this.destroy$))
      .subscribe((entityId) => {
        this.entityTypeId = entityId ?? 0;
      });

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.customers$ = combineLatest([
      this.customerService.customerWithCRUD$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([customers, searchStr]) =>
        customers.filter((customer) =>
          (customer.description ?? '')
            .toLocaleLowerCase()
            .includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.customerService.enableCustomerGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.customerService.enableCustomerFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.customerService.enableCustomerGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearCustomerSelection();
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
      this.clearCustomerSelection();
      this.setCustomerFormEditing(true);
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
    const customer = (args.rowData ??
      this.selectedCustomerSubject.value) as ICustomer | null;
    if (customer?.customerId) {
      this.selectCustomer(customer);
      this.setCustomerFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar un cliente...',
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
    const selected = this.selectedCustomerSubject.value;
    if (args.target?.title === 'Delete' && selected) {
      this.customerService.deleteCustomer(selected);
      this.clearCustomerSelection();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const customer = (args.data ? args.data : null) as ICustomer | null;
    if (!customer?.customerId) {
      return;
    }
    const previousId = this.selectedCustomerSubject.value?.customerId ?? 0;
    this.selectCustomer(customer);
    if (previousId !== customer.customerId) {
      this.setCustomerFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectCustomer(customer: ICustomer): void {
    this.selectedCustomerSubject.next(customer);
    this.customerService.setCustomerContext(customer.customerId);
    // Same contact key pattern as organization: entity type + owner id
    if (this.entityTypeId > 0) {
      this.applicationService.entitySelected(this.entityTypeId);
    }
    this.applicationService.organizationIdSelected(customer.customerId);
    this.enableContactChildGrids(true);
  }

  private clearCustomerSelection(): void {
    this.setCustomerFormEditing(false);
    this.enableContactChildGrids(false);
    this.selectedCustomerSubject.next(null);
    this.customerService.setCustomerContext(0);
    this.applicationService.organizationIdSelected(0);
  }

  private setCustomerFormEditing(editing: boolean): void {
    this.customerService.enableCustomerForm(editing);
  }

  private enableContactChildGrids(enable: boolean): void {
    this.applicationService.enableAddressChildGrid(enable);
    this.applicationService.enableEmailChildGrid(enable);
    this.applicationService.enablePhoneChildGrid(enable);
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
}
