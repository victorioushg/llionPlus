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
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  catchError,
  combineLatest,
  fromEvent,
  map,
  startWith,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { contentGridHeight, applyGridHeightAboveFooter } from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { PurchaseOrderService } from './purchase-order.service';
import { IPurchaseOrder } from './purchase-order';

@Component({
  selector: 'llion-content',
  templateUrl: './purchase-order-grid.html',
  styleUrls: ['./purchase-order-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PurchaseOrderComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(
    [
      {
        text: 'Add',
        tooltipText: 'Incluir',
        prefixIcon: 'e-add',
        id: 'add',
      },
      {
        text: 'Edit',
        tooltipText: 'Modificar',
        prefixIcon: 'e-edit',
        id: 'edit',
      },
      {
        text: 'Delete',
        tooltipText: 'Eliminar',
        prefixIcon: 'e-delete',
        id: 'delete',
      },
      'Search',
    ],
    'Órdenes de compra'
  );
  searchSettings?: SearchSettingsModel;
  screenHeight = contentGridHeight();
  placeholderText = 'Seleccione una orden de compra';

  purchaseOrders$!: Observable<IPurchaseOrder[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedOrderSubject =
    new BehaviorSubject<IPurchaseOrder | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.purchaseOrders$ = combineLatest([
      this.purchaseOrderService.purchaseOrders$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([orders, searchStr]) => {
        const term = (searchStr || '').toLocaleLowerCase().trim();
        const filtered = term
          ? orders.filter((order) =>
              `${order.poNumber ?? ''} ${order.providerName ?? ''}`
                .toLocaleLowerCase()
                .includes(term)
            )
          : orders;
        return [...filtered].sort((a, b) => this.compareDescending(a, b));
      }),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );
  }

  ngAfterViewInit(): void {
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
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

    const itemId = (args.item?.id ?? '').split('_').pop();
    const target = args.originalEvent?.target as HTMLElement | undefined;
    const targetId =
      itemId ||
      (target?.id === ''
        ? target.closest('button')?.id?.split('_').pop()
        : target?.id?.split('_').pop());

    if (targetId === 'add' || args.item?.text === 'Add') {
      this.beginAdd();
      args.cancel = true;
    } else if (targetId === 'edit' || args.item?.text === 'Edit') {
      this.beginEdit();
      args.cancel = true;
    } else if (targetId === 'delete' || args.item?.text === 'Delete') {
      this.deleteSelected();
      args.cancel = true;
    } else if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const order = (args.data ? args.data : null) as IPurchaseOrder | null;
    if (!order?.poId) {
      return;
    }
    this.selectedOrderSubject.next(order);
    this.placeholderText = `Orden ${order.poNumber || order.poId}`;
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const order = (args.rowData ??
      this.selectedOrderSubject.value) as IPurchaseOrder | null;
    if (order?.poId) {
      this.selectedOrderSubject.next(order);
      this.beginEdit();
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar una orden de compra',
        toastType.warning
      );
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedOrderSubject.value) as IPurchaseOrder | null;
    if (args.target?.title === 'Delete' && row?.poId) {
      this.deleteOrder(row);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  onDataBound(): void {
    this.updateGridHeight();
  }

  private beginAdd(): void {
    this.selectedOrderSubject.next(null);
    this.grid?.clearRowSelection();
    this.placeholderText = 'Nueva orden de compra';
    this.cdr.markForCheck();
  }

  private beginEdit(): void {
    const selected = this.selectedOrderSubject.value;
    if (!selected?.poId) {
      this.toastService.showMyToast(
        'Debe seleccionar una orden de compra',
        toastType.warning
      );
      return;
    }
    this.placeholderText = `Modificar orden ${selected.poNumber || selected.poId}`;
    this.cdr.markForCheck();
  }

  private deleteSelected(): void {
    const selected = this.selectedOrderSubject.value;
    if (!selected?.poId) {
      this.toastService.showMyToast(
        'Debe seleccionar una orden de compra',
        toastType.warning
      );
      return;
    }
    this.deleteOrder(selected);
  }

  private deleteOrder(order: IPurchaseOrder): void {
    this.purchaseOrderService
      .deletePurchaseOrder(order)
      .pipe(take(1))
      .subscribe({
        next: (deletedId) => {
          if (deletedId > 0) {
            this.selectedOrderSubject.next(null);
            this.placeholderText = 'Seleccione una orden de compra';
            this.cdr.markForCheck();
          }
        },
      });
  }

  private compareDescending(a: IPurchaseOrder, b: IPurchaseOrder): number {
    const dateA = this.toTime(a.issueDate);
    const dateB = this.toTime(b.issueDate);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const numberCmp = (b.poNumber || '').localeCompare(a.poNumber || '', 'es', {
      numeric: true,
      sensitivity: 'base',
    });
    if (numberCmp !== 0) {
      return numberCmp;
    }
    return (b.poId || 0) - (a.poId || 0);
  }

  private toTime(value: Date | string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
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
