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
  FilterSettingsModel,
  GridComponent,
  RecordDoubleClickEventArgs,
  RowDeselectEventArgs,
  RowSelectEventArgs,
  SearchEventArgs,
  SearchSettingsModel,
  SelectionSettingsModel,
  SortSettingsModel,
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
import { JournalEntryService } from './journal-entry.service';
import { IJournalEntry, isJournalEntryLocked } from './journal-entry';

@Component({
  selector: 'llion-content',
  templateUrl: './journal-entry-grid.html',
  styleUrls: ['./journal-entry-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class JournalEntryComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(
    [
      {
        text: 'Add',
        tooltipText: 'Incluir',
        prefixIcon: 'e-add',
        id: 'add',
      },
      {
        text: 'Edit',
        tooltipText: 'Modificar',
        prefixIcon: 'e-edit',
        id: 'edit',
      },
      {
        text: 'Delete',
        tooltipText: 'Eliminar',
        prefixIcon: 'e-delete',
        id: 'delete',
      },
      'Search',
    ],
    'Asientos contables'
  );
  searchSettings?: SearchSettingsModel;
  filterSettings: FilterSettingsModel = { type: 'CheckBox' };
  sortSettings: SortSettingsModel = {
    columns: [{ field: 'journalEntryDate', direction: 'Descending' }],
  };
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;

  journalEntries$!: Observable<IJournalEntry[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedSubject = new BehaviorSubject<IJournalEntry | null>(
    null
  );
  private readonly destroy$ = new Subject<void>();

  constructor(
    private journalEntryService: JournalEntryService,
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

    this.journalEntries$ = combineLatest([
      this.journalEntryService.journalEntries$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) => {
        const term = (searchStr || '').toLocaleLowerCase().trim();
        const filtered = term
          ? rows.filter((row) =>
              `${row.journalEntryCode ?? ''} ${row.description ?? ''} ${row.entryKind ?? ''}`
                .toLocaleLowerCase()
                .includes(term)
            )
          : rows;
        return [...filtered].sort((a, b) => this.compareDescending(a, b));
      }),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateGridHeight(), 700);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.journalEntryService.setSelectedId(0);
    this.journalEntryService.enableForm(false);
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
      this.beginAdd();
      args.cancel = true;
    } else if (targetId === 'edit' || args.item?.text === 'Edit') {
      this.beginEdit();
      args.cancel = true;
    } else if (targetId === 'delete' || args.item?.text === 'Delete') {
      this.deleteSelected();
      args.cancel = true;
    } else if (targetId === 'searchbutton') {
      this.search();
      args.cancel = true;
    } else if (targetId === 'clearbutton') {
      this.search(true);
      args.cancel = true;
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const entry = (args.data ? args.data : null) as IJournalEntry | null;
    if (!entry?.journalEntryId) {
      return;
    }
    this.selectedSubject.next(entry);
    this.journalEntryService.setSelectedId(entry.journalEntryId);
    this.journalEntryService.enableForm(false);
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const entry = (args.rowData ??
      this.selectedSubject.value) as IJournalEntry | null;
    if (!entry?.journalEntryId) {
      this.toastService.showMyToast(
        'Debe seleccionar un asiento',
        toastType.warning
      );
      return;
    }
    this.selectedSubject.next(entry);
    this.selectRow(entry.journalEntryId, args.rowIndex);
    this.beginEdit();
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedSubject.value) as IJournalEntry | null;
    if (args.target?.title === 'Delete' && row?.journalEntryId) {
      this.deleteEntry(row);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  private beginAdd(): void {
    this.selectedSubject.next(null);
    this.grid?.clearRowSelection();
    this.journalEntryService.beginNewJournalEntry();
    this.cdr.markForCheck();
  }

  private beginEdit(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.journalEntryId) {
      this.toastService.showMyToast(
        'Debe seleccionar un asiento',
        toastType.warning
      );
      return;
    }
    if (isJournalEntryLocked(selected)) {
      this.toastService.showMyToast(
        'El asiento bloqueado no se puede modificar',
        toastType.warning
      );
      return;
    }
    this.journalEntryService.setSelectedId(selected.journalEntryId);
    this.selectRow(selected.journalEntryId);
    this.journalEntryService.enableForm(true);
    this.cdr.markForCheck();
  }

  private selectRow(journalEntryId: number, rowIndex?: number): void {
    if (!this.grid || journalEntryId <= 0) {
      return;
    }
    const index =
      rowIndex ?? this.grid.getRowIndexByPrimaryKey(journalEntryId);
    if (index == null || index < 0) {
      return;
    }
    const selected = this.grid.getSelectedRowIndexes() ?? [];
    if (selected.length === 1 && selected[0] === index) {
      return;
    }
    this.grid.selectRow(index);
  }

  private deleteSelected(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.journalEntryId) {
      this.toastService.showMyToast(
        'Debe seleccionar un asiento',
        toastType.warning
      );
      return;
    }
    this.deleteEntry(selected);
  }

  private deleteEntry(entry: IJournalEntry): void {
    this.journalEntryService
      .deleteJournalEntry(entry)
      .pipe(take(1))
      .subscribe({
        next: (deletedId) => {
          if (deletedId > 0) {
            this.selectedSubject.next(null);
            this.cdr.markForCheck();
          }
        },
      });
  }

  private compareDescending(a: IJournalEntry, b: IJournalEntry): number {
    const dateA = this.toTime(a.journalEntryDate);
    const dateB = this.toTime(b.journalEntryDate);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const codeCmp = (b.journalEntryCode || '').localeCompare(
      a.journalEntryCode || '',
      'es',
      { numeric: true, sensitivity: 'base' }
    );
    if (codeCmp !== 0) {
      return codeCmp;
    }
    return (b.journalEntryId || 0) - (a.journalEntryId || 0);
  }

  private toTime(value: Date | string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
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

  private updateGridHeight(): void {
    const gridEl = this.grid?.element as HTMLElement | undefined;
    const contentEl = gridEl?.querySelector(
      '.e-gridcontent'
    ) as HTMLElement | null;
    this.screenHeight = contentGridHeight(200, contentEl ?? gridEl ?? null);
    this.panelHeight = contentGridHeight(200, gridEl ?? null);
    if (this.grid) {
      this.grid.height = this.screenHeight;
    }
    this.cdr.markForCheck();
  }
}
