import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  GridComponent,
  SearchEventArgs,
  RowSelectEventArgs,
  RowDeselectEventArgs,
  RecordDoubleClickEventArgs,
  CommandModel,
  CommandClickEventArgs,
  SearchSettingsModel,
} from '@syncfusion/ej2-angular-grids';

import { OrganizationService } from './organization.service';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { contentGridHeight, applyGridHeightAboveFooter } from '@shared/utils/layout';
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
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IOrganization } from './organization';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import {
  ClickEventArgs,
  TabComponent,
} from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-content',
  templateUrl: './organization-grid.html',
  styleUrls: ['./organization-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationComponent implements OnInit, AfterViewInit, OnDestroy {
  public commands!: CommandModel[];
  screenHeight = contentGridHeight();

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  readonly searchStringAction$ = this.searchStringSubject.asObservable();
  private readonly selectedOrganizationSubject =
    new BehaviorSubject<IOrganization | null>(null);
  private readonly destroy$ = new Subject<void>();

  organizations$!: Observable<IOrganization[]>;
  entityId!: number;

  toolbar = withToolbarTitle(MiniToolbar as object[], 'Organizaciones');
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid!: GridComponent;
  @ViewChild('tabs') public tabObj?: TabComponent;
  @ViewChild('toast') toast!: ElementRef;

  selectedOrganization$ = this.selectedOrganizationSubject.asObservable();

  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  headerText: { text: string }[] = [
    { text: 'organización' },
    { text: 'parámetros y contadores' },
    { text: 'impuestos y retenciones' },
    { text: 'créditos y débitos' },
    { text: 'monedas y cambios' },
  ];

  constructor(
    private applicationService: ApplicationService,
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
      this.showAllTabs();
    }
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
  }

  ngOnInit(): void {
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());

    this.clearOrganizationSelection();

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.organizations$ = combineLatest([
      this.organizationService.organizationWithCRUD$,
      this.searchStringAction$.pipe(startWith('')),
    ]).pipe(
      map(([organizations, searchStr]) =>
        organizations.filter((organization) =>
          organization.name
            .toLocaleLowerCase()
            .includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.organizationService.enableOrganizationGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    // List grid lock only while editing organization form inputs
    this.organizationService.enableOrganizationFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.organizationService.enableOrganizationGrid(!!editing);
      });
  }

  onToolbarClick(args: ClickEventArgs): void {
    if (
      args.item?.id === 'gridToolbarTitle' ||
      args.item?.cssClass === 'e-grid-toolbar-title'
    ) {
      args.cancel = true;
      return;
    }

    const target: HTMLElement = args.originalEvent.target as HTMLElement;
    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.clearOrganizationSelection();
      this.setOrganizationFormEditing(true);
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
    const organization = (args.rowData ??
      this.selectedOrganizationSubject.value) as IOrganization | null;
    const organizationId = organization?.organizationId ?? 0;

    if (organization && organizationId > 0) {
      this.selectOrganization(organization);
      this.setOrganizationFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar una empresa...',
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
    const selectedOrganization = this.selectedOrganizationSubject.value;
    if (args.target?.title == 'Delete' && selectedOrganization) {
      this.organizationService.deleteOrganization(selectedOrganization);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const organization = (args.data ? args.data : null) as IOrganization | null;
    if (!organization?.organizationId) {
      return;
    }

    const previousId =
      this.selectedOrganizationSubject.value?.organizationId ?? 0;
    const sameOrganization = previousId === organization.organizationId;

    this.selectOrganization(organization);

    // New selection leaves organization form in read-only; other tabs stay usable.
    if (!sameOrganization) {
      this.setOrganizationFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {
    // Keep last selection so tabs still show that organization.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearOrganizationSelection();
  }

  private selectOrganization(organization: IOrganization): void {
    this.selectedOrganizationSubject.next(organization);
    this.applicationService.organizationIdSelected(organization.organizationId);
    this.organizationService.setOrganizationContext(organization.organizationId);
    if (this.organizationService.entityId > 0) {
      this.applicationService.entitySelected(this.organizationService.entityId);
    }
    this.enableContactChildGrids(true);
    this.showAllTabs();
  }

  private clearOrganizationSelection(): void {
    this.setOrganizationFormEditing(false);
    this.enableContactChildGrids(false);
    this.selectedOrganizationSubject.next(null);
    this.organizationService.setOrganizationContext(0);
    this.applicationService.organizationIdSelected(0);
    this.showAllTabs();
  }

  /** Only organization form inputs + Accept/Cancel on the first tab. */
  private setOrganizationFormEditing(editing: boolean): void {
    this.organizationService.enableOrganizationForm(editing);
  }

  private enableContactChildGrids(enable: boolean): void {
    this.applicationService.enableAddressChildGrid(enable);
    this.applicationService.enableEmailChildGrid(enable);
    this.applicationService.enablePhoneChildGrid(enable);
  }

  private showAllTabs(): void {
    if (!this.tabObj) {
      return;
    }
    for (let index = 0; index < this.headerText.length; index++) {
      this.tabObj.hideTab(index, false);
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
