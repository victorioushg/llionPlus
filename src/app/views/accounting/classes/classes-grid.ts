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
  fromEvent,
  map,
  shareReplay,
  startWith,
  take,
  takeUntil,
} from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import MiniToolbar from '@assets/json/minitoolbar.json';
import {
  withToolbarTitle,
  bindGridSearchAsYouType,
} from '@shared/utils/grid-toolbar';
import {
  applyGridHeightAboveFooter,
  contentGridHeight,
} from '@shared/utils/layout';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ClassesService } from './classes.service';
import { IAccountClass } from './class';

@Component({
  selector: 'llion-content',
  templateUrl: './classes-grid.html',
  styleUrls: ['./classes-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ClassesComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Centro de costos');
  searchSettings?: SearchSettingsModel;
  screenHeight = contentGridHeight();

  classes$!: Observable<IAccountClass[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;

  headerText: { text: string }[] = [
    { text: 'Centro de Costo' },
    { text: 'movimientos' },
  ];

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedClassSubject =
    new BehaviorSubject<IAccountClass | null>(null);
  private allClasses: IAccountClass[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private classesService: ClassesService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
    this.updateGridHeight();
    setTimeout(() => this.updateGridHeight(), 0);
    bindGridSearchAsYouType(
      () => this.grid,
      (value) => this.searchStringSubject.next(value),
      this.destroy$
    );
  }

  ngOnInit(): void {
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());

    this.clearClassSelection();

    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.classes$ = combineLatest([
      this.classesService.classes$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([classes, searchStr]) => {
        this.allClasses = classes ?? [];
        const needle = searchStr.toLocaleLowerCase();
        return this.allClasses
          .filter((item) => {
            return (
              (item.name ?? '').toLocaleLowerCase().includes(needle) ||
              (item.fullName ?? '').toLocaleLowerCase().includes(needle)
            );
          })
          .sort((a, b) =>
            String(a.fullName ?? a.name ?? '').localeCompare(
              String(b.fullName ?? b.name ?? ''),
              'es',
              { sensitivity: 'base' }
            )
          );
      }),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.classesService.enableClassGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.classesService.enableClassFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.classesService.enableClassGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearClassSelection();
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
      this.clearClassSelection();
      this.setClassFormEditing(true);
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
    const item = (args.rowData ??
      this.selectedClassSubject.value) as IAccountClass | null;
    if (item?.classId) {
      this.selectClass(item);
      this.setClassFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar un centro de costo...',
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
    if (args.target?.title === 'Delete') {
      this.deleteSelectedClass();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const item = (args.data ? args.data : null) as IAccountClass | null;
    if (!item?.classId) {
      return;
    }
    const previousId = this.selectedClassSubject.value?.classId ?? 0;
    this.selectClass(item);
    if (previousId !== item.classId) {
      this.setClassFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private deleteSelectedClass(): void {
    const selected = this.selectedClassSubject.value;
    if (!selected?.classId) {
      this.toastService.showMyToast(
        'Debe seleccionar un centro de costo...',
        toastType.error
      );
      return;
    }
    if (this.hasChildNodes(selected.classId)) {
      this.toastService.showMyToast(
        'No se puede eliminar: el centro de costo tiene subclases',
        toastType.warning
      );
      return;
    }
    this.classesService.deleteClass(selected).pipe(take(1)).subscribe();
    this.clearClassSelection();
  }

  private hasChildNodes(classId: number): boolean {
    return this.allClasses.some((row) => Number(row.parentId) === classId);
  }

  private selectClass(item: IAccountClass): void {
    this.selectedClassSubject.next(item);
    this.classesService.setClassContext(item.classId);
  }

  private clearClassSelection(): void {
    this.setClassFormEditing(false);
    this.selectedClassSubject.next(null);
    this.classesService.setClassContext(0);
  }

  private setClassFormEditing(editing: boolean): void {
    this.classesService.enableClassForm(editing);
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
    this.screenHeight = applyGridHeightAboveFooter(this.grid);
    this.cdr.markForCheck();
  }
}
