import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@syncfusion/ej2-angular-popups';
import { GridModule, EditService, ToolbarService } from '@syncfusion/ej2-angular-grids';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import {
  EditSettingsModel,
  ToolbarItems
} from '@syncfusion/ej2-angular-grids';
import { DialogComponent } from '@syncfusion/ej2-angular-popups';

@Component({
  selector: 'app-group-table',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    GridModule,
    ButtonModule
  ],
  templateUrl: './group-table.component.html',
  styleUrls: ['./group-table.component.scss'],
  providers: [EditService, ToolbarService]
})
export class GroupTableComponent {
  @ViewChild('dialog') public dialog?: DialogComponent;

  public rowData = [
    { ItemId: 1, Product: 'Laptop', Qty: 2 },
    { ItemId: 2, Product: 'Mouse', Qty: 5 }
  ];

  public gridEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top' // change to 'Bottom' if you want add at the end
  };

  public gridToolbar: ToolbarItems[] = ['Add', 'Edit', 'Delete', 'Update', 'Cancel'];

  public dialogButtons = [
    {
      click: () => this.saveDialog(),
      buttonModel: {
        content: 'Save',
        isPrimary: true
      }
    },
    {
      click: () => this.closeDialog(),
      buttonModel: {
        content: 'Cancel'
      }
    }
  ];

  public showDialog(): void {
    this.dialog?.show();
  }

  public closeDialog(): void {
    this.dialog?.hide();
  }

  public saveDialog(): void {
    // here you already have updated rowData from the grid
    console.log('dialog data', this.rowData);
    this.dialog?.hide();
  }
}
