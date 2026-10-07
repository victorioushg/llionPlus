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
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { contentGridHeight } from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ProductionService } from '../production.service';
import {
  IProductionNote,
  IProductionTrackingRow,
  ORDER_STATUS_COMPLETED,
  ORDER_STATUS_PENDING,
} from '../production';

@Component({
  selector: 'llion-content',
  templateUrl: './production-tracking-grid.html',
  styleUrls: ['../production-grid.scss', '../production-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProductionTrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  toolbar = withToolbarTitle(
    [{ text: 'Search' }],
    'Seguimiento de producción'
  );
  searchSettings?: SearchSettingsModel;
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;
  rows$!: Observable<IProductionTrackingRow[]>;
  selected: IProductionTrackingRow | null = null;
  notes: IProductionNote[] = [];
  deliverQty = 0;
  noteComment = '';
  pendingOnly = true;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
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
    this.searchSettings = { operator: 'contains' };

    this.productionService.productionOrderSelected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((order) => {
        if (
          this.selected &&
          order.productionOrderId === this.selected.productionOrderId
        ) {
          this.notes = order.notes ?? [];
          this.cdr.markForCheck();
        }
      });

    this.rows$ = combineLatest([
      this.productionService.tracking$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) =>
        rows.filter((row) => {
          if (this.pendingOnly && (row.pendingQuantity ?? 0) <= 0) {
            return false;
          }
          const needle = searchStr.toLocaleLowerCase();
          return (
            (row.productName ?? '').toLocaleLowerCase().includes(needle) ||
            (row.orderNumber ?? '').toLocaleLowerCase().includes(needle) ||
            (row.formulationCode ?? '').toLocaleLowerCase().includes(needle)
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
    if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const row = (args.data ? args.data : null) as IProductionTrackingRow | null;
    if (!row?.productionOrderLineId) {
      return;
    }
    this.selected = row;
    this.deliverQty = Number(row.pendingQuantity) || 0;
    this.productionService.setSelectedOrderId(row.productionOrderId);
    this.cdr.markForCheck();
  }

  togglePendingOnly(): void {
    this.searchStringSubject.next(this.searchStringSubject.value);
  }

  canStart(): boolean {
    return !!this.selected && this.selected.status === ORDER_STATUS_PENDING;
  }

  canDeliver(): boolean {
    return (
      !!this.selected &&
      this.selected.status !== ORDER_STATUS_COMPLETED &&
      (this.selected.pendingQuantity ?? 0) > 0
    );
  }

  startSelected(): void {
    if (!this.selected) {
      return;
    }
    this.productionService
      .startProduction(
        this.selected.productionOrderId,
        this.selected.productionOrderLineId
      )
      .pipe(take(1))
      .subscribe(() => this.cdr.markForCheck());
  }

  deliverSelected(): void {
    if (!this.selected || this.deliverQty <= 0) {
      return;
    }
    this.productionService
      .deliverProduction(
        this.selected.productionOrderId,
        this.selected.productionOrderLineId,
        this.deliverQty
      )
      .pipe(take(1))
      .subscribe(() => this.cdr.markForCheck());
  }

  addNote(): void {
    const comment = (this.noteComment ?? '').trim();
    if (!this.selected || !comment) {
      return;
    }
    this.productionService
      .addNote(this.selected.productionOrderId, comment)
      .pipe(take(1))
      .subscribe((id) => {
        if (id > 0) {
          this.noteComment = '';
          this.cdr.markForCheck();
        }
      });
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
