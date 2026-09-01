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
import { ProviderDocumentService } from './provider-document.service';
import { IProviderDocument } from './provider-document';
import {
  IProviderDocumentKindConfig,
  ProviderDocumentKind,
} from './provider-document-kind';

@Component({
  selector: 'llion-content',
  templateUrl: './provider-document-grid.html',
  styleUrls: ['./provider-document-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [ProviderDocumentService],
})
export class ProviderDocumentGridComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  config!: IProviderDocumentKindConfig;
  commands!: CommandModel[];
  toolbar!: ReturnType<typeof withToolbarTitle>;
  searchSettings?: SearchSettingsModel;
  screenHeight!: number;
  panelHeight!: number;
  documents$!: Observable<IProviderDocument[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedSubject = new BehaviorSubject<IProviderDocument | null>(
    null
  );
  private readonly destroy$ = new Subject<void>();

  constructor(
    route: ActivatedRoute,
    private documentService: ProviderDocumentService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {
    const kind = route.snapshot.data['kind'] as ProviderDocumentKind;
    this.documentService.configure(kind);
    this.config = this.documentService.config;
    this.toolbar = withToolbarTitle(
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
      this.config.title
    );
  }

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

    this.documents$ = combineLatest([
      this.documentService.documents$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) => {
        const term = (searchStr || '').toLocaleLowerCase().trim();
        const filtered = term
          ? rows.filter((row) =>
              `${row.documentNumber ?? ''} ${row.providerName ?? ''}`
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
    this.documentService.setSelectedId(0);
    this.documentService.enableForm(false);
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
    const row = (args.data ? args.data : null) as IProviderDocument | null;
    if (!row?.documentId) {
      return;
    }
    this.selectedSubject.next(row);
    this.documentService.setSelectedId(row.documentId);
    this.documentService.enableForm(false);
    this.cdr.markForCheck();
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedSubject.value) as IProviderDocument | null;
    if (row?.documentId) {
      this.selectedSubject.next(row);
      this.beginEdit();
    } else {
      this.toastService.showMyToast(this.config.selectWarning, toastType.warning);
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ??
      this.selectedSubject.value) as IProviderDocument | null;
    if (args.target?.title === 'Delete' && row?.documentId) {
      this.deleteRow(row);
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
    this.documentService.setSelectedId(0);
    this.documentService.enableForm(true);
    this.cdr.markForCheck();
  }

  private beginEdit(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.documentId) {
      this.toastService.showMyToast(this.config.selectWarning, toastType.warning);
      return;
    }
    this.documentService.setSelectedId(selected.documentId);
    this.documentService.enableForm(true);
    this.cdr.markForCheck();
  }

  private deleteSelected(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.documentId) {
      this.toastService.showMyToast(this.config.selectWarning, toastType.warning);
      return;
    }
    this.deleteRow(selected);
  }

  private deleteRow(row: IProviderDocument): void {
    this.documentService
      .deleteDocument(row)
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

  private compareDescending(a: IProviderDocument, b: IProviderDocument): number {
    const dateA = this.toTime(a.issueDate);
    const dateB = this.toTime(b.issueDate);
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    const numberCmp = (b.documentNumber || '').localeCompare(
      a.documentNumber || '',
      'es',
      { numeric: true, sensitivity: 'base' }
    );
    if (numberCmp !== 0) {
      return numberCmp;
    }
    return (b.documentId || 0) - (a.documentId || 0);
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
