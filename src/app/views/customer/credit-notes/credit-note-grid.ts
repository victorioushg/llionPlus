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
import { CreditNoteService } from './credit-note.service';
import { ICreditNote } from './credit-note';

@Component({
  selector: 'llion-content',
  templateUrl: './credit-note-grid.html',
  styleUrls: ['./credit-note-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class CreditNoteGridComponent implements OnInit, AfterViewInit, OnDestroy {
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
    'Notas crédito'
  );
  searchSettings?: SearchSettingsModel;
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;

  creditNotes$!: Observable<ICreditNote[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedCreditNoteSubject = new BehaviorSubject<ICreditNote | null>(
    null
  );
  private readonly destroy$ = new Subject<void>();

  constructor(
    private creditNoteService: CreditNoteService,
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

    this.creditNotes$ = combineLatest([
      this.creditNoteService.creditNotes$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([quotes, searchStr]) => {
        const term = (searchStr || '').toLocaleLowerCase().trim();
        const filtered = term
          ? quotes.filter((quote) =>
              `${quote.creditNoteNumber ?? ''} ${quote.customerName ?? ''}`
                .toLocaleLowerCase()
                .includes(term)
            )
          : quotes;
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
    this.creditNoteService.setSelectedCreditNoteId(0);
    this.creditNoteService.enableForm(false);
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
    const quote = (args.data ? args.data : null) as ICreditNote | null;
    if (!quote?.creditNoteId) {
      return;
    }
    this.selectedCreditNoteSubject.next(quote);
    this.creditNoteService.setSelectedCreditNoteId(quote.creditNoteId);
    this.creditNoteService.enableForm(false);
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const quote = (args.rowData ??
      this.selectedCreditNoteSubject.value) as ICreditNote | null;
    if (!quote?.creditNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de crédito',
        toastType.warning
      );
      return;
    }
    this.selectedCreditNoteSubject.next(quote);
    this.selectCreditNoteRow(quote.creditNoteId, args.rowIndex);
    this.beginEdit();
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedCreditNoteSubject.value) as ICreditNote | null;
    if (args.target?.title === 'Delete' && row?.creditNoteId) {
      this.deleteCreditNote(row);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  private beginAdd(): void {
    this.selectedCreditNoteSubject.next(null);
    this.grid?.clearRowSelection();
    this.creditNoteService.beginNewCreditNote();
    this.cdr.markForCheck();
  }

  private beginEdit(): void {
    const selected = this.selectedCreditNoteSubject.value;
    if (!selected?.creditNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de crédito',
        toastType.warning
      );
      return;
    }
    if (selected.lockedDate) {
      this.toastService.showMyToast(
        'La nota de crédito está cerrada y no se puede modificar',
        toastType.warning
      );
      return;
    }
    this.creditNoteService.setSelectedCreditNoteId(selected.creditNoteId);
    this.selectCreditNoteRow(selected.creditNoteId);
    this.creditNoteService.enableForm(true);
    this.cdr.markForCheck();
  }

  private selectCreditNoteRow(creditNoteId: number, rowIndex?: number): void {
    if (!this.grid || creditNoteId <= 0) {
      return;
    }
    const index = rowIndex ?? this.grid.getRowIndexByPrimaryKey(creditNoteId);
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
    const selected = this.selectedCreditNoteSubject.value;
    if (!selected?.creditNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de crédito',
        toastType.warning
      );
      return;
    }
    this.deleteCreditNote(selected);
  }

  private deleteCreditNote(quote: ICreditNote): void {
    if (quote.lockedDate) {
      this.toastService.showMyToast(
        'La nota de crédito está cerrada y no se puede eliminar',
        toastType.warning
      );
      return;
    }
    this.creditNoteService
      .deleteCreditNote(quote)
      .pipe(take(1))
      .subscribe({
        next: (deletedId) => {
          if (deletedId > 0) {
            this.selectedCreditNoteSubject.next(null);
            this.cdr.markForCheck();
          }
        },
      });
  }

  private compareDescending(a: ICreditNote, b: ICreditNote): number {
    const dateA = this.toTime(a.issueDate);
    const dateB = this.toTime(b.issueDate);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const numberCmp = (b.creditNoteNumber || '').localeCompare(
      a.creditNoteNumber || '',
      'es',
      {
        numeric: true,
        sensitivity: 'base',
      }
    );
    if (numberCmp !== 0) {
      return numberCmp;
    }
    return (b.creditNoteId || 0) - (a.creditNoteId || 0);
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
