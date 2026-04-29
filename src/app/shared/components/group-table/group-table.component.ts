import {
  Component,
  ViewChild,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  Observable,
  startWith,
  tap,
} from 'rxjs';
import {
  ClickEventArgs,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-angular-navigations';
import { DialogModule } from '@syncfusion/ej2-angular-popups';
import {
  GridModule,
  GridComponent,
  EditService,
  ToolbarService,
  SearchService,
} from '@syncfusion/ej2-angular-grids';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { EditSettingsModel, ToolbarItems } from '@syncfusion/ej2-angular-grids';
import { DialogComponent } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-group-table',
  standalone: true,
  imports: [CommonModule, DialogModule, GridModule, ButtonModule],
  templateUrl: './group-table.component.html',
  styleUrls: ['./group-table.component.scss'],
  providers: [EditService, ToolbarService, SearchService],
})
export class GroupTableComponent implements OnChanges {
  @ViewChild('dialog') public dialog?: DialogComponent;
  @ViewChild('gridgrouptable') public grid!: GridComponent;

  @Input() dialogTitle = 'Items';
  @Input() rowData: any[] = [];
  @Input() idField = 'groupId';
  @Input() textField = 'description';
  @Input() textHeader = 'Product';

  @Output() dataChange = new EventEmitter<any[]>();

  private searchStringSubject = new BehaviorSubject<string>('');
  searchStringAction$ = this.searchStringSubject.asObservable();

  public gridEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top', // change to 'Bottom' if you want add at the end
  };

  public localRowData: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rowData']) {
      this.localRowData = [...(this.rowData || [])];
    }
  }

  public gridToolbar: ToolbarItems[] = [
    'Add',
    'Edit',
    'Delete',
    'Update',
    'Cancel',
    'Search',
  ];

  onToolbarClick(args: ClickEventArgs): void {
    const target: HTMLElement = args.originalEvent.target as HTMLElement; //.closest('button'); // find clicked button

    const targetId =
      target.id === ''
        ? target.closest('button')?.id
        : target.id.split('_').pop();

    if (targetId === 'add') {
      args.cancel = true;
    }
  }

  public dialogButtons = [
    {
      click: () => this.closeDialog(),
      buttonModel: {
        content: 'Close',
      },
    },
  ];

  public showDialog(): void {
    this.dialog?.show();
  }

  public closeDialog(): void {
    this.dialog?.hide();
  }

  public saveDialog(): void {
    this.dataChange.emit([...this.localRowData]);
    this.dialog?.hide();
  }

  private searchTimer: any;

  public onGridCreated(): void {
    const searchInput = document.getElementById(
      this.grid.element.id + '_searchbar',
    ) as HTMLInputElement;

    if (searchInput) {
      searchInput.addEventListener('keyup', () => {
        clearTimeout(this.searchTimer);

        this.searchTimer = setTimeout(() => {
          this.grid.search(searchInput.value);
        }, 250);
      });
    }
  }
}
