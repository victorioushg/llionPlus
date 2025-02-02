import { CommonModule } from '@angular/common';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ROUTES } from './_routes';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { UserComponent } from '@views/application/users/user-grid';

// Syncfusion
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import {
  ToolbarModule,
  TabModule,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
} from '@syncfusion/ej2-angular-navigations';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import {
  DropDownListModule,
  MultiSelectModule,
} from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule, SwitchModule } from '@syncfusion/ej2-angular-buttons';

import { DatePickerModule } from '@syncfusion/ej2-angular-calendars';

import { enableRipple } from '@syncfusion/ej2-base';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UsersDetailComponent } from './users-detail/users-detail';
// import { OrganizationDetailInputComponent } from './organization-detail-input/organization-detail-input';
// import { AddressComponent } from '@app/shared/components/address/address-detail';
// import { AddressGridComponent } from '@app/shared/components/address/address-grid';
// import { EmailComponent } from '@app/shared/components/email/email-detail';
// import { EmailGridComponent } from '@app/shared/components/email/email-grid';
// import { PhoneComponent } from '@app/shared/components/phones/phone-detail';
// import { PhoneGridComponent } from '@app/shared/components/phones/phone-grid';
import { HttpClientJsonpModule, HttpClientModule, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';

enableRipple(true);

@NgModule({
  declarations: [
    UserComponent,
    UsersDetailComponent,
    // OrganizationDetailInputComponent,
    // AddressComponent,
    // AddressGridComponent,
    // EmailComponent,
    // EmailGridComponent,
    // PhoneComponent,
    // PhoneGridComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(ROUTES),
    FontAwesomeModule,
    ToolbarModule,
    TabModule,
    GridAllModule,
    TextBoxModule,
    DropDownListModule,
    MultiSelectModule, 
    SwitchModule,
    DatePickerModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
  ],

  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [provideHttpClient(withInterceptorsFromDi())],
})
export class UserModule {}
