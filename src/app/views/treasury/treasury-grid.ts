import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
import { TreasuryService } from './treasury.service';
import {
  ITreasury,
  TREASURY_TYPE_BANK,
  TREASURY_TYPE_CASHBOX,
} from './treasury';

/** app_entity.EntityId for Treasury */
const TREASURY_ENTITY_ID = 6;

@Component({
  selector: 'llion-content',
  templateUrl: './treasury-grid.html',
  styleUrls: ['./treasury-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class TreasuryComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Tesorería');
  searchSettings?: SearchSettingsModel;

  treasuries$!: Observable<ITreasury[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  headerText: { text: string }[] = [{ text: 'tesorería' }];
  treasuryType: string = TREASURY_TYPE_BANK;

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedTreasurySubject =
    new BehaviorSubject<ITreasury | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
    private treasuryService: TreasuryService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.treasuryType =
        data['treasuryType'] === TREASURY_TYPE_CASHBOX
          ? TREASURY_TYPE_CASHBOX
          : TREASURY_TYPE_BANK;

      const title =
        this.treasuryType === TREASURY_TYPE_CASHBOX ? 'Cajas' : 'Bancos';
      this.toolbar = withToolbarTitle(MiniToolbar as object[], title);
      this.headerText = [
        {
          text: this.treasuryType === TREASURY_TYPE_CASHBOX ? 'caja' : 'banco',
        },
      ];

      this.treasuryService.setTreasuryTypeFilter(this.treasuryType);
      this.clearTreasurySelection();
      this.cdr.markForCheck();
    });

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.treasuries$ = combineLatest([
      this.treasuryService.treasuryWithCRUD$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([treasuries, searchStr]) =>
        treasuries.filter((treasury) => {
          const needle = searchStr.toLocaleLowerCase();
          return (
            (treasury.treasuryName ?? '')
              .toLocaleLowerCase()
              .includes(needle) ||
            (treasury.alternCode ?? '').toLocaleLowerCase().includes(needle)
          );
        })
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.treasuryService.enableTreasuryGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.treasuryService.enableTreasuryFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.treasuryService.enableTreasuryGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTreasurySelection();
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
      this.clearTreasurySelection();
      this.setTreasuryFormEditing(true);
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
    const treasury = (args.rowData ??
      this.selectedTreasurySubject.value) as ITreasury | null;
    if (treasury?.treasuryId) {
      this.selectTreasury(treasury);
      this.setTreasuryFormEditing(true);
    } else {
      this.toastService.showMyToast(
        this.treasuryType === TREASURY_TYPE_CASHBOX
          ? 'Debe seleccionar una caja...'
          : 'Debe seleccionar un banco...',
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
    const selected = this.selectedTreasurySubject.value;
    if (args.target?.title === 'Delete' && selected) {
      this.treasuryService.deleteTreasury(selected);
      this.clearTreasurySelection();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const treasury = (args.data ? args.data : null) as ITreasury | null;
    if (!treasury?.treasuryId) {
      return;
    }
    const previousId = this.selectedTreasurySubject.value?.treasuryId ?? 0;
    this.selectTreasury(treasury);
    if (previousId !== treasury.treasuryId) {
      this.setTreasuryFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectTreasury(treasury: ITreasury): void {
    this.selectedTreasurySubject.next(treasury);
    this.treasuryService.setTreasuryContext(treasury.treasuryId);

    // Agency contacts (address/phone/email) only for bancos (BAN)
    if (this.treasuryType === TREASURY_TYPE_BANK && treasury.treasuryId > 0) {
      this.applicationService.entitySelected(TREASURY_ENTITY_ID);
      this.applicationService.organizationIdSelected(treasury.treasuryId);
      this.enableContactChildGrids(true);
    } else {
      this.enableContactChildGrids(false);
      this.applicationService.organizationIdSelected(0);
    }
  }

  private clearTreasurySelection(): void {
    this.setTreasuryFormEditing(false);
    this.enableContactChildGrids(false);
    this.selectedTreasurySubject.next(null);
    this.treasuryService.setTreasuryContext(0);
    this.applicationService.organizationIdSelected(0);
  }

  private setTreasuryFormEditing(editing: boolean): void {
    this.treasuryService.enableTreasuryForm(editing);
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
