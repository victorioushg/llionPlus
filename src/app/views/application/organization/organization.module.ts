import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './_routes';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OrganizationComponent } from '@views/application/organization/organization-grid';
import { OrganizationDetailComponent } from './organization-detail/organization-detail';
import { OrganizationTaxesComponent } from './organization-taxes/organization-taxes';
import { OrganizationRetentionsComponent } from './organization-retentions/organization-retentions';
import { OrganizationExchangesComponent } from './organization-exchanges/organization-exchanges';
import { OrganizationParametersComponent } from './organization-parameters/organization-parameters';
import { OrganizationCreditsComponent } from './organization-credits/organization-credits';
// Syncfusion
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import {
  ToolbarModule,
  TabModule, 
} from '@syncfusion/ej2-angular-navigations';
import { TextBoxModule,  MaskedTextBoxModule, NumericTextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule, MultiSelectModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';

import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';

import { enableRipple } from '@syncfusion/ej2-base';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ContactGridsModule } from '@shared/components/contact-grids.module';

enableRipple(true);

@NgModule({
  declarations: [
    OrganizationComponent,
    OrganizationDetailComponent,
    OrganizationTaxesComponent,
    OrganizationRetentionsComponent,
    OrganizationExchangesComponent,
    OrganizationParametersComponent,
    OrganizationCreditsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ToolbarModule,
    TabModule, 
    GridAllModule,
    TextBoxModule,
    MaskedTextBoxModule,
    NumericTextBoxModule, 
    DropDownListModule,
    MultiSelectModule,
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ContactGridsModule,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
  providers: [],
})
export class OrganizationModule {}
