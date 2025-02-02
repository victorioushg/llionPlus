import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {
  GridComponent,
  ToolbarItems,
  SearchEventArgs,
  RowSelectEventArgs,
  RowDeselectEventArgs,
  SearchSettingsModel,
  CommandModel,
  CommandClickEventArgs,
  RecordDoubleClickEventArgs,
  SelectionSettingsModel,
} from '@syncfusion/ej2-angular-grids';
import { UserService } from './user.service';
import MiniToolbar from '@assets/json/minitoolbar.json';
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  catchError,
  combineLatest,
  map,
  startWith,
  tap,
} from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
import { IUser } from './user';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { ClickEventArgs, TabComponent } from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@shared/services/applicattionService';

@Component({
  selector: 'llion-content',
  templateUrl: './user-grid.html',
  styleUrls: ['./user-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class UserComponent implements OnInit {
  public commands: CommandModel[] | undefined;

  public selectionOptions?: SelectionSettingsModel;

  private searchStringSubject = new BehaviorSubject<string>('');
  searchStringAction$ = this.searchStringSubject.asObservable();

  users$: Observable<IUser[]> = new Observable<IUser[]>();

  toolbar: ToolbarItems[] | object = MiniToolbar;
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid: GridComponent | undefined;
  @ViewChild('tabs') public tabObj?: TabComponent;
  @ViewChild('toast') toast: ElementRef | undefined;

  selectedUser: IUser | undefined;

  enabled$: Observable<boolean> | undefined;

  headerText: Object[] = [
    { text: 'usuario' },
    // { text: 'parámetros y contadores' },
    // { text: 'impuestos y retenciones' },
    // { text: 'créditos y débitos' },
  ];

  /////
  constructor(
    private applicationService: ApplicationService,
    private userService: UserService,
    private toastService: ToastService
  ) {}

  ngAfterViewInit(): void {
    if (this.tabObj) {
      (this.tabObj as TabComponent).element.classList.add('e-fill');
    }
  }

  ngOnInit(): void {
    
    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'e-trash e-icons' },
      },
    ];
    this.searchSettings = { operator: 'contains' };

    this.selectionOptions = { mode: 'Row', type: 'Single' };

    this.users$ = combineLatest([
      this.userService.userWithCRUD$.pipe(startWith([] as IUser[])),
      this.searchStringAction$.pipe(startWith('')),
    ]).pipe(
      map(([users, searchStr]) =>
        users.filter((user) =>
          user.displayName
            .toLocaleLowerCase()
            .includes(searchStr.toLocaleLowerCase())
        )
      ),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    this.enabled$ = this.applicationService.enableUserGridAction$.pipe(
      tap((enabled) => {
        if (this.grid) {
          if (enabled) {
            this.grid.element.classList.add('disablegrid');
            document.getElementById('grid')?.classList.add('wrapper');
          } else {
            this.grid.element.classList.remove('disablegrid');
            document.getElementById('grid')?.classList.remove('wrapper');
          }
        }
      })
    );
  }

  onToolbarClick(args: ClickEventArgs): void {
    const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button

    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      this.userService.selectedUserChanged(0);
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
    if (this.selectedUser !== undefined) {
      this.applicationService.entitySelected(this.selectedUser.userId);
      this.enableParentForm(true);
    } else {
      this.toastService.showMyToast(
        'Debe seleccionar un usuario...',
        toastType.error
      );
    }
  }

  enableParentForm(enable: boolean) {
    this.applicationService.enableUserGrid(enable);
    this.applicationService.enableUserForm(enable);
    // this.applicationService.enableChildGrid(enable);
    // this.applicationService.enableEmailChildGrid(enable);
  }

  actionBegin(args: SearchEventArgs): void {
    if (args.requestType === 'searching') {
      this.search();
      args.cancel = true;
    }
  }

  commandClick(args: CommandClickEventArgs): void {
    if (args.target?.title == 'Delete' && this.selectedUser) {
      this.userService.deleteUser(this.selectedUser);
    }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    this.selectedUser = (args.data ? args.data : []) as IUser;
    this.userService.selectedUserChanged(this.selectedUser.userId);
    this.applicationService.entitySelected(this.selectedUser.userId);
  }

  onRowDeselected(args: RowDeselectEventArgs): void {
    // this.selectedUser = undefined;
    // this.userService.selectedUserChanged(0);
  }

  private search(clear: boolean = false) {
    const searchString: HTMLInputElement = document.getElementById(
      this.grid?.element.id + '_searchbar'
    ) as HTMLInputElement;
    if (clear) searchString.value = '';
    this.searchStringSubject.next(searchString.value ? searchString.value : '');
  }
}
