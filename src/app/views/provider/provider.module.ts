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
import { ProviderComponent } from './provider-grid';
import { ProviderDetailComponent } from './provider-detail/provider-detail';
import { ProviderMovementsComponent } from './provider-movements/provider-movements';
import { PurchaseOrderComponent } from './purchase-orders/purchase-order-grid';
import { PurchaseOrderDetailComponent } from './purchase-orders/purchase-order-detail/purchase-order-detail';
import { ProviderDocumentGridComponent } from './documents/provider-document-grid';
import { ProviderDocumentDetailComponent } from './documents/provider-document-detail';

enableRipple(true);

@NgModule({
  declarations: [
    ProviderComponent,
    ProviderDetailComponent,
    ProviderMovementsComponent,
    PurchaseOrderComponent,
    PurchaseOrderDetailComponent,
    ProviderDocumentGridComponent,
    ProviderDocumentDetailComponent,
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
    SwitchModule,
    DatePickerModule,
    DropDownListModule,
    ButtonModule,
    FormsModule,
    ReactiveFormsModule,
    ContactGridsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ProviderModule {}
