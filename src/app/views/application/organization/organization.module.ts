import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './_routes';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { OrganizationComponent } from '@views/application/organization/organization-grid';

// Syncfusion
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import {
  ToolbarModule,
  TabModule, 
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-angular-navigations';
import { TextBoxModule,  MaskedTextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';

import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';

import { enableRipple } from '@syncfusion/ej2-base';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { OrganizationDetailComponent } from './organization-detail/organization-detail';
import { OrganizationDetailInputComponent } from './organization-detail-input/organization-detail-input';
import { AddressComponent } from '@shared/components/address/address-detail';
import { AddressGridComponent } from '@shared/components/address/address-grid';
import { EmailComponent } from '@shared/components/email/email-detail';
import { EmailGridComponent } from '@shared/components/email/email-grid';
import { PhoneComponent } from '@shared/components/phones/phone-detail';
import { PhoneGridComponent } from '@shared/components/phones/phone-grid';

enableRipple(true);

@NgModule({
  declarations: [
    OrganizationComponent,
    OrganizationDetailComponent,
    OrganizationDetailInputComponent,
    AddressComponent, 
    AddressGridComponent,
    EmailComponent,
    EmailGridComponent, 
    PhoneComponent,
    PhoneGridComponent
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
    DropDownListModule,
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA], 
  providers: [],
})
export class OrganizationModule {}
