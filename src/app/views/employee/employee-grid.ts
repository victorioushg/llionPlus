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
import { EmployeeService } from './employee.service';
import { IEmployee } from './employee';

@Component({
  selector: 'llion-content',
  templateUrl: './employee-grid.html',
  styleUrls: ['./employee-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EmployeeComponent implements OnInit, AfterViewInit, OnDestroy {
  commands!: CommandModel[];
  toolbar = withToolbarTitle(MiniToolbar as object[], 'Trabajadores');
  searchSettings?: SearchSettingsModel;

  employees$!: Observable<IEmployee[]>;
  enabled$!: Observable<boolean>;
  disabledGrid$!: Observable<boolean>;
  entityTypeId = 0;

  headerText: { text: string }[] = [{ text: 'trabajador' }];

  @ViewChild('grid') grid!: GridComponent;
  @ViewChild('tabs') tabObj?: TabComponent;

  private readonly searchStringSubject = new BehaviorSubject<string>('');
  private readonly selectedEmployeeSubject =
    new BehaviorSubject<IEmployee | null>(null);
  private readonly destroy$ = new Subject<void>();

  constructor(
    private applicationService: ApplicationService,
    private employeeService: EmployeeService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
    this.clearEmployeeSelection();

    this.applicationService
      .getEntityId('Human Resources')
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

    this.employees$ = combineLatest([
      this.employeeService.employeeWithCRUD$,
      this.searchStringSubject.asObservable().pipe(startWith('')),
    ]).pipe(
      map(([employees, searchStr]) =>
        employees.filter((employee) => {
          const haystack =
            `${employee.lastName ?? ''} ${employee.firstName ?? ''} ${employee.alternCode ?? ''} ${employee.identificationNumber ?? ''}`.toLocaleLowerCase();
          return haystack.includes(searchStr.toLocaleLowerCase());
        })
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.employeeService.enableEmployeeGridAction$.pipe(
      shareReplay(1)
    );
    this.disabledGrid$ = this.enabled$.pipe(shareReplay(1));

    this.employeeService.enableEmployeeFormAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((editing) => {
        this.employeeService.enableEmployeeGrid(!!editing);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearEmployeeSelection();
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
      this.clearEmployeeSelection();
      this.setEmployeeFormEditing(true);
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
    const employee = (args.rowData ??
      this.selectedEmployeeSubject.value) as IEmployee | null;
    if (employee?.employeeId) {
      this.selectEmployee(employee);
      this.setEmployeeFormEditing(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar un trabajador...',
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
    const selected = this.selectedEmployeeSubject.value;
    if (args.target?.title === 'Delete' && selected) {
      this.employeeService.deleteEmployee(selected);
      this.clearEmployeeSelection();
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    const employee = (args.data ? args.data : null) as IEmployee | null;
    if (!employee?.employeeId) {
      return;
    }
    const previousId = this.selectedEmployeeSubject.value?.employeeId ?? 0;
    this.selectEmployee(employee);
    if (previousId !== employee.employeeId) {
      this.setEmployeeFormEditing(false);
    }
  }

  onRowDeselected(_args: RowDeselectEventArgs): void {}

  private selectEmployee(employee: IEmployee): void {
    this.selectedEmployeeSubject.next(employee);
    this.employeeService.setEmployeeContext(employee.employeeId);
    if (this.entityTypeId > 0) {
      this.applicationService.entitySelected(this.entityTypeId);
    }
    this.applicationService.organizationIdSelected(employee.employeeId);
    this.enableContactChildGrids(true);
  }

  private clearEmployeeSelection(): void {
    this.setEmployeeFormEditing(false);
    this.enableContactChildGrids(false);
    this.selectedEmployeeSubject.next(null);
    this.employeeService.setEmployeeContext(0);
    this.applicationService.organizationIdSelected(0);
  }

  private setEmployeeFormEditing(editing: boolean): void {
    this.employeeService.enableEmployeeForm(editing);
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
