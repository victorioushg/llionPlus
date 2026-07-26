import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridAllModule } from '@syncfusion/ej2-angular-grids';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { TextBoxModule, MaskedTextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { AddressGridComponent } from './address/address-grid';
import { EmailGridComponent } from './email/email-grid';
import { PhoneGridComponent } from './phones/phone-grid';

@NgModule({
  declarations: [
    AddressGridComponent,
    EmailGridComponent,
    PhoneGridComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    GridAllModule,
    DropDownListModule,
    TextBoxModule,
    MaskedTextBoxModule,
    ButtonModule,
  ],
  exports: [
    AddressGridComponent,
    EmailGridComponent,
    PhoneGridComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContactGridsModule {}
