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
import { DeliveryNoteService } from './delivery-note.service';
import { IDeliveryNote } from './delivery-note';

@Component({
  selector: 'llion-content',
  templateUrl: './delivery-note-grid.html',
  styleUrls: ['./delivery-note-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DeliveryNoteGridComponent implements OnInit, AfterViewInit, OnDestroy {
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
    'Notas de entrega'
  );
  searchSettings?: SearchSettingsModel;
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;

  deliveryNotes$!: Observable<IDeliveryNote[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedDeliveryNoteSubject = new BehaviorSubject<IDeliveryNote | null>(
    null
  );
  private readonly destroy$ = new Subject<void>();

  constructor(
    private deliveryNoteService: DeliveryNoteService,
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

    this.deliveryNotes$ = combineLatest([
      this.deliveryNoteService.deliveryNotes$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([quotes, searchStr]) => {
        const term = (searchStr || '').toLocaleLowerCase().trim();
        const filtered = term
          ? quotes.filter((quote) =>
              `${quote.deliveryNoteNumber ?? ''} ${quote.customerName ?? ''}`
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
    this.deliveryNoteService.setSelectedDeliveryNoteId(0);
    this.deliveryNoteService.enableForm(false);
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
    const quote = (args.data ? args.data : null) as IDeliveryNote | null;
    if (!quote?.deliveryNoteId) {
      return;
    }
    this.selectedDeliveryNoteSubject.next(quote);
    this.deliveryNoteService.setSelectedDeliveryNoteId(quote.deliveryNoteId);
    this.deliveryNoteService.enableForm(false);
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const quote = (args.rowData ??
      this.selectedDeliveryNoteSubject.value) as IDeliveryNote | null;
    if (!quote?.deliveryNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de entrega',
        toastType.warning
      );
      return;
    }
    this.selectedDeliveryNoteSubject.next(quote);
    this.selectDeliveryNoteRow(quote.deliveryNoteId, args.rowIndex);
    this.beginEdit();
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedDeliveryNoteSubject.value) as IDeliveryNote | null;
    if (args.target?.title === 'Delete' && row?.deliveryNoteId) {
      this.deleteDeliveryNote(row);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  private beginAdd(): void {
    this.selectedDeliveryNoteSubject.next(null);
    this.grid?.clearRowSelection();
    this.deliveryNoteService.beginNewDeliveryNote();
    this.cdr.markForCheck();
  }

  private beginEdit(): void {
    const selected = this.selectedDeliveryNoteSubject.value;
    if (!selected?.deliveryNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de entrega',
        toastType.warning
      );
      return;
    }
    if (selected.lockedDate) {
      this.toastService.showMyToast(
        'La nota de entrega está cerrada y no se puede modificar',
        toastType.warning
      );
      return;
    }
    this.deliveryNoteService.setSelectedDeliveryNoteId(selected.deliveryNoteId);
    this.selectDeliveryNoteRow(selected.deliveryNoteId);
    this.deliveryNoteService.enableForm(true);
    this.cdr.markForCheck();
  }

  private selectDeliveryNoteRow(deliveryNoteId: number, rowIndex?: number): void {
    if (!this.grid || deliveryNoteId <= 0) {
      return;
    }
    const index = rowIndex ?? this.grid.getRowIndexByPrimaryKey(deliveryNoteId);
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
    const selected = this.selectedDeliveryNoteSubject.value;
    if (!selected?.deliveryNoteId) {
      this.toastService.showMyToast(
        'Debe seleccionar una nota de entrega',
        toastType.warning
      );
      return;
    }
    this.deleteDeliveryNote(selected);
  }

  private deleteDeliveryNote(quote: IDeliveryNote): void {
    if (quote.lockedDate) {
      this.toastService.showMyToast(
        'La nota de entrega está cerrada y no se puede eliminar',
        toastType.warning
      );
      return;
    }
    this.deliveryNoteService
      .deleteDeliveryNote(quote)
      .pipe(take(1))
      .subscribe({
        next: (deletedId) => {
          if (deletedId > 0) {
            this.selectedDeliveryNoteSubject.next(null);
            this.cdr.markForCheck();
          }
        },
      });
  }

  private compareDescending(a: IDeliveryNote, b: IDeliveryNote): number {
    const dateA = this.toTime(a.issueDate);
    const dateB = this.toTime(b.issueDate);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const numberCmp = (b.deliveryNoteNumber || '').localeCompare(
      a.deliveryNoteNumber || '',
      'es',
      {
        numeric: true,
        sensitivity: 'base',
      }
    );
    if (numberCmp !== 0) {
      return numberCmp;
    }
    return (b.deliveryNoteId || 0) - (a.deliveryNoteId || 0);
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
