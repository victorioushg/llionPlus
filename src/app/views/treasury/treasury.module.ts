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
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import {
  ButtonModule,
  CheckBoxModule,
  SwitchModule,
} from '@syncfusion/ej2-angular-buttons';
import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';
import { enableRipple } from '@syncfusion/ej2-base';
import { ContactGridsModule } from '@shared/components/contact-grids.module';
import { routes } from './_routes';
import { TreasuryComponent } from './treasury-grid';
import { TreasuryDetailComponent } from './treasury-detail/treasury-detail';
import { TreasuryMovementsComponent } from './treasury-movements/treasury-movements';

enableRipple(true);

@NgModule({
  declarations: [
    TreasuryComponent,
    TreasuryDetailComponent,
    TreasuryMovementsComponent,
  ],
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
    DatePickerModule,
    SwitchModule,
    CheckBoxModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ContactGridsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TreasuryModule {}
