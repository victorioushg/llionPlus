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
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { withToolbarTitle, bindGridSearchAsYouType } from '@shared/utils/grid-toolbar';
import { contentGridHeight } from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ProductionService } from '../production.service';
import { IFormulation, IOverheadType } from '../production';

@Component({
  selector: 'llion-content',
  templateUrl: './formulation-grid.html',
  styleUrls: ['../production-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FormulationComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(
    [
      { text: 'Add', tooltipText: 'Incluir', prefixIcon: 'e-add', id: 'add' },
      { text: 'Edit', tooltipText: 'Modificar', prefixIcon: 'e-edit', id: 'edit' },
      { text: 'Delete', tooltipText: 'Eliminar', prefixIcon: 'e-delete', id: 'delete' },
      'Search',
    ],
    'Formulaciones'
  );
  searchSettings?: SearchSettingsModel;
  selectionSettings: SelectionSettingsModel = {
    type: 'Single',
    mode: 'Row',
    enableToggle: false,
  };
  screenHeight!: number;
  panelHeight!: number;
  formulations$!: Observable<IFormulation[]>;

  @ViewChild('grid') grid!: GridComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedSubject = new BehaviorSubject<IFormulation | null>(null);
  private readonly destroy$ = new Subject<void>();
  private overheadTypes: IOverheadType[] = [];

  constructor(
    private productionService: ProductionService,
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

    this.productionService.overheadTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.overheadTypes = rows ?? []));

    this.formulations$ = combineLatest([
      this.productionService.formulations$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([rows, searchStr]) =>
        rows.filter((row) => {
          const needle = searchStr.toLocaleLowerCase();
          return (
            (row.name ?? '').toLocaleLowerCase().includes(needle) ||
            (row.formulationCode ?? '').toLocaleLowerCase().includes(needle) ||
            (row.productLineName ?? '').toLocaleLowerCase().includes(needle)
          );
        })
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );
  }

  ngAfterViewInit(): void {
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productionService.setSelectedFormulationId(0);
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
      target.id === '' ? target.closest('button')?.id : target.id.split('_').pop();
    if (targetId === 'add') {
      this.selectedSubject.next(null);
      this.grid?.clearRowSelection();
      this.productionService.beginNewFormulation(this.overheadTypes);
      args.cancel = true;
    } else if (targetId === 'edit') {
      this.beginEdit();
      args.cancel = true;
    } else if (targetId === 'delete') {
      const selected = this.selectedSubject.value;
      if (selected?.formulationId) {
        this.productionService.deleteFormulation(selected);
        this.selectedSubject.next(null);
      }
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
    const row = (args.rowData ?? this.selectedSubject.value) as IFormulation | null;
    if (row?.formulationId) {
      this.selectedSubject.next(row);
      this.productionService.setSelectedFormulationId(row.formulationId);
      this.productionService.enableFormulationForm(true);
    }
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    const row = (args.rowData ?? this.selectedSubject.value) as IFormulation | null;
    if (args.target?.title === 'Delete' && row?.formulationId) {
      this.productionService.deleteFormulation(row);
      this.selectedSubject.next(null);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const row = (args.data ? args.data : null) as IFormulation | null;
    if (!row?.formulationId) {
      return;
    }
    this.selectedSubject.next(row);
    this.productionService.setSelectedFormulationId(row.formulationId);
    this.productionService.enableFormulationForm(false);
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private beginEdit(): void {
    const selected = this.selectedSubject.value;
    if (!selected?.formulationId) {
      this.toastService.showMyToast(
        'Debe seleccionar una formulación',
        toastType.warning
      );
      return;
    }
    this.productionService.setSelectedFormulationId(selected.formulationId);
    this.productionService.enableFormulationForm(true);
  }

  private search(clear = false): void {
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
    this.screenHeight = contentGridHeight();
    this.panelHeight = this.screenHeight;
    this.cdr.markForCheck();
  }
}
