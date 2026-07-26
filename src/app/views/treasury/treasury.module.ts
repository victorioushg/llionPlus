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
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';
import { enableRipple } from '@syncfusion/ej2-base';
import { ContactGridsModule } from '@shared/components/contact-grids.module';
import { routes } from './_routes';
import { TreasuryComponent } from './treasury-grid';
import { TreasuryDetailComponent } from './treasury-detail/treasury-detail';

enableRipple(true);

@NgModule({
  declarations: [TreasuryComponent, TreasuryDetailComponent],
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
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ContactGridsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TreasuryModule {}
