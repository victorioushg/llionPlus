import {
  AfterViewInit,
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
  startWith,
  tap,
} from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
import { IMerchandise } from './merchandise';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import {
  ClickEventArgs,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@shared/services/applicattionService';
import { TabHeader } from '@shared/models/syncfusion-interfaces';

@Component({
  selector: 'llion-content',
  templateUrl: './merchandise-grid.html',
  styleUrls: ['./merchandise-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseComponent implements OnInit, AfterViewInit {
  public commands!: CommandModel[];

  private searchStringSubject = new BehaviorSubject<string>('');
  searchStringAction$ = this.searchStringSubject.asObservable();

  merchandises$!: Observable<IMerchandise[]>;
  parentRefEntityI!: number;

  toolbar: ToolbarItems[] | object = MiniToolbar;
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid!: GridComponent;
  @ViewChild('tabs') public tabObj?: TabComponent;
  @ViewChild('toast') toast!: ElementRef;

  selectedMerchandise: IMerchandise | undefined;

  enabled$!: Observable<boolean>;

  // public headerText!: Object[];
  headerText: Object[] = [
    { text: 'organización' },
    { text: 'parámetros y contadores' },
    { text: 'impuestos y retenciones' },
    { text: 'créditos y débitos' },
  ];

  /////
  constructor(
    private applicationService: ApplicationService,
    private merchandiseService: MerchandiseService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
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
        merchandises.filter((merchandise) =>
          merchandise.description
            .toLocaleLowerCase()
            .includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.merchandiseService.enableMerchandiseGridAction$.pipe(
      tap((enabled) => {
        if (this.grid) {
          if (enabled) {
            this.grid.element.classList.add('disablegrid');
            document.getElementById('grid')?.classList.add('wrapper');
          } else {
            this.grid.element.classList.remove('disablegrid');
            document.getElementById('grid')?.classList.remove('wrapper');
          }
        }
      })
    );

    // ParentRefEntityId Reactive
    this.applicationService
      .getParentRefEntityId('Merchandise')
      .subscribe((id) => {
        console.log(' Parent Entity Active - ' + id);
        this.applicationService.parentRefEntityIdSelected(id);
      });
  }

  onToolbarClick(args: ClickEventArgs): void {
    const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button

    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.merchandiseService.selectedMerchandiseChanged(0);
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
    if (this.selectedMerchandise !== undefined) {
      this.applicationService.entitySelected(this.selectedMerchandise.merchandiseEntityId);
      this.enableParentForm(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar una empresa...',
        toastType.error
      );
    }
  }

  enableParentForm(enable: boolean) {
    this.merchandiseService.enableMerchandiseGrid(enable);
    this.merchandiseService.enableMerchandiseForm(enable);
    this.applicationService.enableAddressChildGrid(enable);
    this.applicationService.enableEmailChildGrid(enable);
    this.applicationService.enablePhoneChildGrid(enable);
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title == 'Delete' && this.selectedMerchandise) {
      this.merchandiseService.deleteMerchandise(this.selectedMerchandise);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    this.selectedMerchandise = (args.data ? args.data : []) as IMerchandise;
    this.merchandiseService.selectedMerchandiseChanged(
      this.selectedMerchandise.merchandiseEntityId
    );
    this.applicationService.entitySelected(this.selectedMerchandise.merchandiseEntityId);
  }

  onRowDeselected(args: RowDeselectEventArgs): void {
    // NOT Uncomment
    //  this.selectedMerchandise = undefined;
    //  this.merchandiseService.selectedMerchandiseChanged(0);
  }

  private search(clear: boolean = false) {
    const searchString: HTMLInputElement = document.getElementById(
      this.grid.element.id + '_searchbar'
    ) as HTMLInputElement;
    if (clear) searchString.value = '';
    this.searchStringSubject.next(searchString.value ? searchString.value : '');
  }
}
