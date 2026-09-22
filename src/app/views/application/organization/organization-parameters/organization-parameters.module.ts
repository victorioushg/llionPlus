import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { NumericTextBoxModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';
import { TreeGridAllModule } from '@syncfusion/ej2-angular-treegrid';
import { OrganizationParametersComponent } from './organization-parameters';

@NgModule({
  declarations: [OrganizationParametersComponent],
  imports: [
    CommonModule,
    FormsModule,
    TreeGridAllModule,
    DropDownListModule,
    TextBoxModule,
    NumericTextBoxModule,
    DatePickerModule,
  ],
  exports: [OrganizationParametersComponent],
})
export class OrganizationParametersModule {}
