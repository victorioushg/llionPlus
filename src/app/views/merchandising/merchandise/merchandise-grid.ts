import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  GridComponent,
  ToolbarItems,
  SearchEventArgs,
  RowSelectEventArgs,
  RowDeselectEventArgs,
  RecordDoubleClickEventArgs,
  CommandModel,
  CommandClickEventArgs,
  SearchSettingsModel,
  EditSettingsModel,
} from '@syncfusion/ej2-angular-grids';

import { MerchandiseService } from './merchandise.service';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  fromEvent,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ChangeDetectionStrategy } from '@angular/core';
import { IMerchandise, IMerchandisePrice } from '../merchandise/merchandise';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import {
  ClickEventArgs,
  ItemModel,
  SelectEventArgs,
  TabComponent,
} from '@syncfusion/ej2-angular-navigations';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';
import { MerchandiseExpedienteComponent } from './merchandise-expediente/merchandise-expediente';
import { MerchandiseMovementComponent } from './merchandise-movements/merchandise-movement-grid';
import { Router } from '@angular/router';
import { SpinnerService } from '@shared/services/spinner.service';

@Component({
  selector: 'llion-content',
  templateUrl: './merchandise-grid.html',
  styleUrls: ['./merchandise-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseComponent implements OnInit, AfterViewInit, OnDestroy {
  public commands!: CommandModel[];
  public screenHeight!: number;
  /** true when route is /merchandising/services */
  isServiceCatalog = false;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  readonly searchStringAction$ = this.searchStringSubject.asObservable();
  private readonly selectedMerchandiseSubject =
    new BehaviorSubject<IMerchandise | null>(null);
  private readonly destroy$ = new Subject<void>();
  private selectedTabIndex = 0;

  merchandises$!: Observable<IMerchandise[]>;
  priceData$!: Observable<IMerchandisePrice[]>;
  entityId!: number;

  /** Same Add button characteristics as UOM grid (Syncfusion e-add), plus Search */
  toolbar = withToolbarTitle(
    [
      {
        text: 'Add',
        tooltipText: 'Add',
        prefixIcon: 'e-add',
        id: 'add',
      },
      'Search',
    ],
    'Mercancías'
  );
  priceToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
    'Precios de mercancía'
  );
  priceEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top',
  };
  readonly priceGridRowHeight = 36;
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid!: GridComponent;
  @ViewChild('pricegrid') public gridprice!: GridComponent;
  @ViewChild('tabs') public tabObj?: TabComponent;
  @ViewChild('toast') toast!: ElementRef;
  @ViewChild(MerchandiseMovementComponent)
  movementsPanel?: MerchandiseMovementComponent;
  @ViewChildren(MerchandiseExpedienteComponent)
  expedientePanels!: QueryList<MerchandiseExpedienteComponent>;

  selectedMerchandise$ = this.selectedMerchandiseSubject.asObservable();

  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;
  formEnabled$!: Observable<boolean>;

  // Controls when the merchandise list spinner is hidden.
  listReady = false;
  isReady = false;

  headerText: { text: string }[] = [
    { text: 'mercancia' },
    { text: 'movimientos' },
    { text: 'compras' },
    { text: 'ventas' },
    { text: 'existencias' },
    { text: 'expediente y Media' },
  ];

  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private spinnerService: SpinnerService
  ) {
    this.spinnerService.suppressGlobal();
  }

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
    setTimeout(() => {
      this.markReady();
      this.updateGridHeights();
    }, 700);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
  }

  ngOnDestroy(): void {
    this.spinnerService.resumeGlobal();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabSelected(args: SelectEventArgs): void {
    this.selectedTabIndex = args.selectedIndex ?? 0;

    if (this.selectedTabIndex === 1) {
      setTimeout(() => this.syncMovementBottom(), 50);
    }

    if (this.selectedTabIndex === 5 && !this.isServiceCatalog) {
      setTimeout(() => {
        this.merchandiseService.refreshMedia();
        this.merchandiseService.refreshProfiles();
        this.expedientePanels?.forEach((panel) => panel.refreshLayouts());
        this.cdr.markForCheck();
      }, 100);
    }
  }

  private markReady(): void {
    if (!this.isReady) {
      this.isReady = true;
      this.cdr.markForCheck();
    }
  }

  private updateGridHeights(): void {
    this.screenHeight = applyGridHeightAboveFooter(this.grid);
    this.cdr.markForCheck();

    // Refine movimientos bottom against the live merchandise grid edge.
    setTimeout(() => this.syncMovementBottom(), 0);
  }

  private syncMovementBottom(): void {
    const merchEl = this.grid?.element as HTMLElement | undefined;
    if (!merchEl || !this.movementsPanel) {
      return;
    }
    this.movementsPanel.alignBottomTo(merchEl.getBoundingClientRect().bottom);
  }

  ngOnInit(): void {
    this.isServiceCatalog = this.router.url.includes('/services');
    this.merchandiseService.setCatalogMode(
      this.isServiceCatalog ? 'service' : 'merchandise'
    );

    if (this.isServiceCatalog) {
      this.toolbar = withToolbarTitle(
        [
          {
            text: 'Add',
            tooltipText: 'Add',
            prefixIcon: 'e-add',
            id: 'add',
          },
          'Search',
        ],
        'Servicios'
      );
      this.priceToolbar = withToolbarTitle(
        ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
        'Precios de servicio'
      );
      this.headerText = [
        { text: 'servicio' },
        { text: 'movimientos' },
        { text: 'compras' },
        { text: 'ventas' },
      ];
    }

    this.updateGridHeights();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeights());

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.merchandises$ = combineLatest([
      this.merchandiseService.merchandiseWithCRUD$,
      this.searchStringAction$.pipe(startWith('')),
    ]).pipe(
      map(([merchandises, searchStr]) =>
        merchandises
          .filter((m) =>
            (m.name ?? '')
              .toLocaleLowerCase()
              .includes(searchStr.toLocaleLowerCase())
          )
          .sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? '', 'es', {
              sensitivity: 'base',
            })
          )
      ),
      tap(() => {
        if (!this.listReady) {
          this.listReady = true;
          this.cdr.markForCheck();
        }
      }),
      catchError((err) => {
        this.listReady = true;
        this.toastService.showMyToast(err, toastType.error);
        this.cdr.markForCheck();
        return EMPTY;
      })
    );
    this.priceData$ = this.merchandiseService.merchandisePrices$;

    this.enabled$ = this.merchandiseService.enableMerchandiseGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));
    this.formEnabled$ =
      this.merchandiseService.enableMerchandiseFormAction$.pipe(shareReplay(1));
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
      this.selectedMerchandiseSubject.next(null);
      // Force empty selection so the detail form resets even if id was already 0
      this.merchandiseService.selectedMerchandiseChanged(-1);
      this.merchandiseService.selectedMerchandiseChanged(0);
      this.enableParentForm(true);
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
    const merchandise = (args.rowData ??
      this.selectedMerchandiseSubject.value) as IMerchandise | null;
    const merchandiseId = merchandise?.merchandiseId ?? 0;

    if (merchandiseId > 0) {
      this.selectedMerchandiseSubject.next(merchandise);
      this.merchandiseService.merchandiseIdSelected(merchandiseId);
      this.enableParentForm(true);
      this.cdr.markForCheck();
    } else {
      this.toastService.showMyToast(
        this.isServiceCatalog
          ? 'Debe seleccionar un servicio...'
          : 'Debe seleccionar una mercancía...',
        toastType.error
      );
    }
  }

  enableParentForm(enable: boolean): void {
    this.merchandiseService.enableMerchandiseForm(enable);
    this.merchandiseService.enableMerchandiseGrid(enable);
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const selectedMerchandise = this.selectedMerchandiseSubject.value;
    if (args.target?.title == 'Delete' && selectedMerchandise) {
      this.merchandiseService.deleteMerchandise(selectedMerchandise);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const merchandise = (args.data ? args.data : null) as IMerchandise | null;
    const merchandiseId = merchandise?.merchandiseId ?? 0;
    if (!merchandise || merchandiseId <= 0) {
      return;
    }

    this.selectedMerchandiseSubject.next(merchandise);
    this.merchandiseService.selectedMerchandiseChanged(merchandiseId);
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {
    // NOT Uncomment
    //  this.selectedMerchandise = undefined;
    //  this.merchandiseService.selectedMerchandiseChanged(0);
  }

  onDataBound(): void {
    this.markReady();

    const selectedMerchandiseId = this.selectedMerchandiseSubject.value?.merchandiseId;
    if (!selectedMerchandiseId || !this.grid) {
      return;
    }

    const records = this.grid.getCurrentViewRecords() as IMerchandise[];
    const rowIndex = records.findIndex(
      (merchandise) => merchandise.merchandiseId === selectedMerchandiseId
    );

    if (rowIndex >= 0) {
      this.grid.selectRow(rowIndex);
    }
  }

  private search(clear: boolean = false): void {
    if (!this.grid?.element?.id) {
      this.searchStringSubject.next('');
      return;
    }
    const searchString: HTMLInputElement = document.getElementById(
      this.grid.element.id + '_searchbar'
    ) as HTMLInputElement;
    if (!searchString) {
      this.searchStringSubject.next('');
      return;
    }
    if (clear) searchString.value = '';
    this.searchStringSubject.next(searchString.value || '');
  }

onCancelClick(): void {
    this.merchandiseService.requestCancelMerchandiseForm();
  }

  onSaveClick(): void {
    this.merchandiseService.requestSaveMerchandiseForm();
  }

}
