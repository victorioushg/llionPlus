import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
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
import MiniToolbar from '@assets/json/minitoolbar.json';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  Observable,
  shareReplay,
  startWith,
} from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
import { IMerchandise, IMerchandisePrice } from '../merchandise/merchandise';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import {
  ClickEventArgs,
  TabComponent,
} from '@syncfusion/ej2-angular-navigations';

@Component({
  selector: 'llion-content',
  templateUrl: './merchandise-grid.html',
  styleUrls: ['./merchandise-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseComponent implements OnInit, AfterViewInit {
  public commands!: CommandModel[];
  public screenHeight!: number;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  readonly searchStringAction$ = this.searchStringSubject.asObservable();
  private readonly selectedMerchandiseSubject =
    new BehaviorSubject<IMerchandise | null>(null);

  merchandises$!: Observable<IMerchandise[]>;
  priceData$!: Observable<IMerchandisePrice[]>;
  entityId!: number;

  toolbar: ToolbarItems[] | object = MiniToolbar;
  priceToolbar: ToolbarItems[] = [
    'Add',
    'Edit',
    'Delete',
    'Update',
    'Cancel',
  ];
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

  selectedMerchandise$ = this.selectedMerchandiseSubject.asObservable();

  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;
  formEnabled$!: Observable<boolean>;

  // Controls when the view is revealed to avoid the Syncfusion render "noise".
  isReady = false;

  // public headerText!: Object[];
  headerText: { text: string }[] = [
    { text: 'mercancia' },
    { text: 'movimientos' },
    { text: 'compras' },
    { text: 'ventas'},
    { text: 'existencias'}, 
    { text: 'cuotas'},
    { text: 'expediente' }
  ];

  /////
  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
    // Fallback reveal in case the grid resolves with no data to bind.
    setTimeout(() => this.markReady(), 700);
  }

  private markReady(): void {
    if (!this.isReady) {
      this.isReady = true;
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
    this.screenHeight = window.innerHeight - 250;
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
        merchandises.filter((m) =>
          m.name.toLocaleLowerCase().includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
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
    const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button

    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.selectedMerchandiseSubject.next(null);
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
        'Debe seleccionar una mercancía...',
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
    const merchandise = (args.data ? args.data : []) as IMerchandise;
    this.selectedMerchandiseSubject.next(merchandise);
    this.merchandiseService.selectedMerchandiseChanged(
      merchandise.merchandiseId
    );
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
