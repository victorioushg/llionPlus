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
} from '@syncfusion/ej2-angular-grids';
import { ParametersService } from './parameters.service';
import MiniToolbar from '@assets/json/minitoolbar.json';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  tap,
} from 'rxjs';
import { ChangeDetectionStrategy } from '@angular/core';
import { IParameter } from './parameter';
import { ToastService } from '@app/shared/services/toastService';
import { toastType } from '@app/shared/enums/enums';
import { ClickEventArgs } from '@syncfusion/ej2-angular-navigations';
import { ApplicationService } from '@app/shared/services/applicattionService';

@Component({
  selector: 'llion-content',
  templateUrl: './parameters-grid.html',
  styleUrls: ['./parameters-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametersComponent implements OnInit {
  public commands: CommandModel[];

  private searchStringSubject = new BehaviorSubject<string>('');
  searchStringAction$ = this.searchStringSubject.asObservable();

  // users$ = combineLatest([
  //   this.userService.userWithCRUD$,
  //   this.searchStringAction$,
  // ]).pipe(
  //   map(([users, searchStr]) =>
  //     users.filter((user) =>
  //       user.displayName
  //         .toLocaleLowerCase()
  //         .includes(searchStr.toLocaleLowerCase())
  //     )
  //   ),
  //   catchError((err) => {
  //     this.toastService.showMyToast(err, toastType.error);
  //     return EMPTY;
  //   })
  // );

  // enabled$ = this.applicationService.enableParentGridAction$.pipe(
  //   tap((enabled) => {
  //     if (this.grid) {
  //       if (enabled) {
  //         this.grid.element.classList.add('disablegrid');
  //         document.getElementById('grid')?.classList.add('wrapper');
  //       } else {
  //         this.grid.element.classList.remove('disablegrid');
  //         document.getElementById('grid')?.classList.remove('wrapper');
  //       }
  //     }
  //   })
  // );

  toolbar: ToolbarItems[] | object = MiniToolbar;
  searchSettings?: SearchSettingsModel;

  @ViewChild('grid') public grid: GridComponent;
  @ViewChild('toast') toast: ElementRef;

  // selectedUser: IUser | undefined;

  /////
  constructor(
    private applicationService: ApplicationService,
    private parametersService: ParametersService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.commands = [
      {
        type: 'Delete',
        buttonOption: { cssClass: 'e-btn', iconCss: 'fa fa-trash' },
      },
    ];
    this.searchSettings = { operator: 'contains' };
  }

  onToolbarClick(args: ClickEventArgs): void {
    //   const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button
    //   const targetId =
    //     target.id === ''
    //       ? target.closest('button')?.id
    //       : target.id.split('_').pop();
    //   if (targetId === 'add') {
    //     this.userService.selectedUserChanged(0);
    //     args.cancel = true;
    //   } else if (targetId === 'searchbutton') {
    //     this.search();
    //     args.cancel = true;
    //   } else if (targetId === 'clearbutton') {
    //     this.search(true);
    //     args.cancel = true;
    //   }
  }

  onRecordDoubleClick(args: RecordDoubleClickEventArgs): void {
    //   if (this.selectedUser !== undefined) {
    //     this.applicationService.entitySelected(this.selectedUser.userId);
    //     this.enableParentForm(true);
    //   } else {
    //     this.toastService.showMyToast(
    //       'Debe seleccionar una empresa...',
    //       toastType.error
    //     );
    //   }
  }

  // enableParentForm(enable: boolean) {
  //   this.applicationService.enableParentGrid(enable);
  //   this.applicationService.enableParentForm(enable);
  //   // this.applicationService.enableChildGrid(enable);
  //   // this.applicationService.enableEmailChildGrid(enable);
  // }

  actionBegin(args: SearchEventArgs): void {
    //   if (args.requestType === 'searching') {
    //     this.search();
    //     args.cancel = true;
    //   }
  }

  commandClick(args: CommandClickEventArgs): void {
    //   if (args.target?.title == 'Delete' && this.selectedUser) {
    //     this.userService.deleteUser(this.selectedUser);
    //   }
  }

  onRowSelected(args: RowSelectEventArgs): void {
    //   this.selectedUser = (args.data ? args.data : []) as IUser;
    //   this.userService.selectedUserChanged(this.selectedUser.userId);
  }

  onRowDeselected(args: RowDeselectEventArgs): void {
    //   // this.selectedUser = undefined;
    //   // this.userService.selectedUserChanged(0);
  }

  // private search(clear: boolean = false) {
  //   const searchString: HTMLInputElement = document.getElementById(
  //     this.grid.element.id + '_searchbar'
  //   ) as HTMLInputElement;
  //   if (clear) searchString.value = '';
  //   this.searchStringSubject.next(searchString.value ? searchString.value : '');
  // }
}
