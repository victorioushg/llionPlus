import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
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

import { OrganizationService } from './organization.service';
import MiniToolbar from '@assets/json/minitoolbar.json';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  Observable,
  shareReplay,
  startWith,
  Subject,
  takeUntil,
} from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
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

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  readonly searchStringAction$ = this.searchStringSubject.asObservable();
  private readonly selectedOrganizationSubject =
    new BehaviorSubject<IOrganization | null>(null);

  organizations$!: Observable<IOrganization[]>;
  entityId!: number;

  toolbar = withToolbarTitle(
    MiniToolbar as object[],
    'Organizaciones'
  );
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid!: GridComponent;
  @ViewChild('tabs') public tabObj?: TabComponent;
  @ViewChild('toast') toast!: ElementRef;

  selectedOrganization$ = this.selectedOrganizationSubject.asObservable();

  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  // public headerText!: Object[];
  headerText: { text: string }[] = [
    { text: 'organización' },
    { text: 'parámetros y contadores' },
    { text: 'impuestos y retenciones' },
    { text: 'créditos y débitos' },
    { text: 'monedas y cambios' },
  ];

  /**
   * Tabs enabled only while editing the organization:
   * parámetros (1), impuestos (2), créditos (3), monedas (4)
   */
  private readonly orgDependentTabIndexes = [1, 2, 3, 4];
  private readonly destroy$ = new Subject<void>();

  /////
  constructor(
    private applicationService: ApplicationService,
    private organizationService: OrganizationService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
      this.updateOrgDependentTabs(false);
    }
  }

  ngOnInit(): void {
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

    // Child tabs + context only while the organization is being modified
    this.organizationService.enableOrganizationFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => this.applyEditMode(editing));
  }

  onToolbarClick(args: ClickEventArgs): void {
    if (
      args.item?.id === 'gridToolbarTitle' ||
      args.item?.cssClass === 'e-grid-toolbar-title'
    ) {
      args.cancel = true;
      return;
    }

    const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button

    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.clearOrganizationSelection();
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
    const organization = (args.rowData ??
      this.selectedOrganizationSubject.value) as IOrganization | null;
    const organizationId = organization?.organizationId ?? 0;

    if (organization && organizationId > 0) {
      // Prefer rowData so edit works even if selection event races after dblclick
      this.selectedOrganizationSubject.next(organization);
      this.applicationService.organizationIdSelected(organizationId);
      if (this.organizationService.entityId > 0) {
        this.applicationService.entitySelected(this.organizationService.entityId);
      }
      this.enableParentForm(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar una empresa...',
        toastType.error
      );
    }
  }

  enableParentForm(enable: boolean): void {
    this.organizationService.enableOrganizationGrid(enable);
    this.organizationService.enableOrganizationForm(enable);
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

    this.selectedOrganizationSubject.next(organization);
    this.applicationService.organizationIdSelected(organization.organizationId);
    if (this.organizationService.entityId > 0) {
      this.applicationService.entitySelected(this.organizationService.entityId);
    }

    // Leaving edit when selecting another org; skip if same row (dblclick race)
    if (!sameOrganization) {
      this.enableParentForm(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {
    // Keep last selection so organization tab still shows data while interacting with the form.
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearOrganizationSelection();
  }

  /** Clears selection; organization tab and dependent tabs have no data. */
  private clearOrganizationSelection(): void {
    this.enableParentForm(false);
    this.selectedOrganizationSubject.next(null);
    this.organizationService.setOrganizationContext(0);
    this.applicationService.organizationIdSelected(0);
    this.updateOrgDependentTabs(false);
  }

  private applyEditMode(editing: boolean): void {
    const organizationId =
      this.selectedOrganizationSubject.value?.organizationId ?? 0;

    // Child tabs (taxes, retenciones, credits, …) need a persisted org id
    if (editing && organizationId > 0) {
      this.organizationService.setOrganizationContext(organizationId);
      this.updateOrgDependentTabs(true);
      return;
    }

    this.organizationService.setOrganizationContext(0);
    this.updateOrgDependentTabs(false);
  }

  private updateOrgDependentTabs(visible: boolean): void {
    if (!this.tabObj) {
      return;
    }

    for (const index of this.orgDependentTabIndexes) {
      this.tabObj.hideTab(index, !visible);
    }

    if (
      !visible &&
      this.orgDependentTabIndexes.includes(this.tabObj.selectedItem)
    ) {
      this.tabObj.select(0);
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
}
