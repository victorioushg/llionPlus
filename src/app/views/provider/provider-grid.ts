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
import { ProviderService } from './provider.service';
import { IProvider } from './provider';

@Component({
  selector: 'llion-content',
  templateUrl: './provider-grid.html',
  styleUrls: ['./provider-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProviderComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Proveedores');
  searchSettings?: SearchSettingsModel;

  providers$!: Observable<IProvider[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;
  entityTypeId = 0;

  headerText: { text: string }[] = [{ text: 'proveedor' }];

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedProviderSubject =
    new BehaviorSubject<IProvider | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private applicationService: ApplicationService,
    private providerService: ProviderService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
    this.clearProviderSelection();

    this.applicationService
      .getEntityId('Provider')
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

    this.providers$ = combineLatest([
      this.providerService.providerWithCRUD$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([providers, searchStr]) =>
        providers.filter((provider) =>
          (provider.description ?? '')
            .toLocaleLowerCase()
            .includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.providerService.enableProviderGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.providerService.enableProviderFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.providerService.enableProviderGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearProviderSelection();
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
      this.clearProviderSelection();
      this.setProviderFormEditing(true);
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
    const provider = (args.rowData ??
      this.selectedProviderSubject.value) as IProvider | null;
    if (provider?.providerId) {
      this.selectProvider(provider);
      this.setProviderFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar un proveedor...',
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
    const selected = this.selectedProviderSubject.value;
    if (args.target?.title === 'Delete' && selected) {
      this.providerService.deleteProvider(selected);
      this.clearProviderSelection();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const provider = (args.data ? args.data : null) as IProvider | null;
    if (!provider?.providerId) {
      return;
    }
    const previousId = this.selectedProviderSubject.value?.providerId ?? 0;
    this.selectProvider(provider);
    if (previousId !== provider.providerId) {
      this.setProviderFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectProvider(provider: IProvider): void {
    this.selectedProviderSubject.next(provider);
    this.providerService.setProviderContext(provider.providerId);
    // Same contact key pattern as organization: entity type + owner id
    if (this.entityTypeId > 0) {
      this.applicationService.entitySelected(this.entityTypeId);
    }
    this.applicationService.organizationIdSelected(provider.providerId);
    this.enableContactChildGrids(true);
  }

  private clearProviderSelection(): void {
    this.setProviderFormEditing(false);
    this.enableContactChildGrids(false);
    this.selectedProviderSubject.next(null);
    this.providerService.setProviderContext(0);
    this.applicationService.organizationIdSelected(0);
  }

  private setProviderFormEditing(editing: boolean): void {
    this.providerService.enableProviderForm(editing);
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
