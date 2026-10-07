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
  SelectionSettingsModel,
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
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { contentGridHeight } from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ProductionService } from '../production.service';
import { IProductionOrder, isProductionOrderLocked } from '../production';

@Component({
  selector: 'llion-content',
  templateUrl: './production-order-grid.html',
  styleUrls: ['../production-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProductionOrderComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(
    [
      { text: 'Add', tooltipText: 'Incluir', prefixIcon: 'e-add', id: 'add' },
      { text: 'Edit', tooltipText: 'Modificar', prefixIcon: 'e-edit', id: 'edit' },
      { text: 'Delete', tooltipText: 'Eliminar', prefixIcon: 'e-delete', id: 'delete' },
      'Search',
    ],
    'Órdenes de producción'
  );
  searchSettings?: SearchSettingsModel;
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;
  orders$!: Observable<IProductionOrder[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedSubject = new BehaviorSubject<IProductionOrder | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private productionService: ProductionService,
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

    this.orders$ = combineLatest([
      this.productionService.productionOrders$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) =>
        rows.filter((row) => {
          const needle = searchStr.toLocaleLowerCase();
          return (
            (row.orderNumber ?? '').toLocaleLowerCase().includes(needle) ||
            (row.description ?? '').toLocaleLowerCase().includes(needle) ||
            (row.statusName ?? '').toLocaleLowerCase().includes(needle)
          );
        })
      ),
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
    this.productionService.setSelectedOrderId(0);
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
      target.id === '' ? target.closest('button')?.id : target.id.split('_').pop();
    if (targetId === 'add') {
      this.selectedSubject.next(null);
      this.grid?.clearRowSelection();
      this.productionService.beginNewProductionOrder();
      args.cancel = true;
    } else if (targetId === 'edit') {
      this.beginEdit();
      args.cancel = true;
    } else if (targetId === 'delete') {
      const selected = this.selectedSubject.value;
      if (selected?.productionOrderId) {
        this.productionService.deleteProductionOrder(selected);
        this.selectedSubject.next(null);
      }
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
    const row = (args.rowData ?? this.selectedSubject.value) as IProductionOrder | null;
    if (row?.productionOrderId) {
      this.selectedSubject.next(row);
      this.productionService.setSelectedOrderId(row.productionOrderId);
      if (!isProductionOrderLocked(row)) {
        this.productionService.enableOrderForm(true);
      }
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ?? this.selectedSubject.value) as IProductionOrder | null;
    if (args.target?.title === 'Delete' && row?.productionOrderId) {
      this.productionService.deleteProductionOrder(row);
      this.selectedSubject.next(null);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const row = (args.data ? args.data : null) as IProductionOrder | null;
    if (!row?.productionOrderId) {
      return;
    }
    this.selectedSubject.next(row);
    this.productionService.setSelectedOrderId(row.productionOrderId);
    this.productionService.enableOrderForm(false);
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private beginEdit(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.productionOrderId) {
      this.toastService.showMyToast(
        'Debe seleccionar una orden de producción',
        toastType.warning
      );
      return;
    }
    if (isProductionOrderLocked(selected)) {
      this.toastService.showMyToast(
        'La orden terminada o anulada no se puede modificar',
        toastType.warning
      );
      return;
    }
    this.productionService.setSelectedOrderId(selected.productionOrderId);
    this.productionService.enableOrderForm(true);
  }

  private search(clear = false): void {
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
    this.screenHeight = contentGridHeight();
    this.panelHeight = this.screenHeight;
    this.cdr.markForCheck();
  }
}
