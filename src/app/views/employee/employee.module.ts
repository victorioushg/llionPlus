import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import { TabModule, ToolbarModule } from '@syncfusion/ej2-angular-navigations';
import {
  NumericTextBoxModule,
  TextBoxModule,
} from '@syncfusion/ej2-angular-inputs';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';
import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { enableRipple } from '@syncfusion/ej2-base';
import { ContactGridsModule } from '@shared/components/contact-grids.module';
import { routes } from './_routes';
import { EmployeeComponent } from './employee-grid';
import { EmployeeDetailComponent } from './employee-detail/employee-detail';

enableRipple(true);

@NgModule({
  declarations: [EmployeeComponent, EmployeeDetailComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ToolbarModule,
    TabModule,
    GridAllModule,
    TextBoxModule,
    NumericTextBoxModule,
    DropDownListModule,
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ContactGridsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmployeeModule {}
