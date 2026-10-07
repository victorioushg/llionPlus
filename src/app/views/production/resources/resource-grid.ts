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
  shareReplay,
  startWith,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { contentGridHeight, applyGridHeightAboveFooter } from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ProductionService } from '../production.service';
import { IProductionResource } from '../production';

@Component({
  selector: 'llion-content',
  templateUrl: './resource-grid.html',
  styleUrls: ['../production-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ResourceComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Recursos');
  searchSettings?: SearchSettingsModel;
  screenHeight = contentGridHeight();

  resources$!: Observable<IProductionResource[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedSubject =
    new BehaviorSubject<IProductionResource | null>(null);
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

    this.resources$ = combineLatest([
      this.productionService.resources$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) =>
        rows.filter((row) => {
          const needle = searchStr.toLocaleLowerCase();
          return (
            (row.name ?? '').toLocaleLowerCase().includes(needle) ||
            (row.resourceCode ?? '').toLocaleLowerCase().includes(needle) ||
            (row.resourceTypeName ?? '').toLocaleLowerCase().includes(needle)
          );
        })
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.productionService.enableResourceGrid$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));
    this.productionService.enableResourceForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) =>
        this.productionService.enableResourceGrid(!!editing)
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
    this.clearSelection();
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
      this.clearSelection();
      this.productionService.enableResourceForm(true);
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
    const row = (args.rowData ??
      this.selectedSubject.value) as IProductionResource | null;
    if (row?.resourceId) {
      this.selectRow(row);
      this.productionService.enableResourceForm(true);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const selected = this.selectedSubject.value;
    if (args.target?.title === 'Delete' && selected) {
      this.productionService.deleteResource(selected);
      this.clearSelection();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const row = (args.data ? args.data : null) as IProductionResource | null;
    if (!row?.resourceId) {
      return;
    }
    const previousId = this.selectedSubject.value?.resourceId ?? 0;
    this.selectRow(row);
    if (previousId !== row.resourceId) {
      this.productionService.enableResourceForm(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectRow(row: IProductionResource): void {
    this.selectedSubject.next(row);
    this.productionService.setSelectedResourceId(row.resourceId);
  }

  private clearSelection(): void {
    this.productionService.enableResourceForm(false);
    this.selectedSubject.next(null);
    this.productionService.setSelectedResourceId(0);
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
    this.screenHeight = applyGridHeightAboveFooter(this.grid);
    this.cdr.markForCheck();
  }
}
