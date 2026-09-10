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
import { CustomerComponent } from './customer-grid';
import { CustomerDetailComponent } from './customer-detail/customer-detail';
import { CustomerMovementsComponent } from './customer-movements/customer-movements';
import { CustomerDocumentPageComponent } from './documents/customer-document-page';
import { QuoteGridComponent } from './quotes/quote-grid';
import { QuoteDetailComponent } from './quotes/quote-detail/quote-detail';
import { SalesOrderGridComponent } from './sales-orders/sales-order-grid';
import { SalesOrderDetailComponent } from './sales-orders/sales-order-detail/sales-order-detail';
import { DeliveryNoteGridComponent } from './delivery-notes/delivery-note-grid';
import { DeliveryNoteDetailComponent } from './delivery-notes/delivery-note-detail/delivery-note-detail';
import { InvoiceGridComponent } from './invoices/invoice-grid';
import { InvoiceDetailComponent } from './invoices/invoice-detail/invoice-detail';
import { CreditNoteGridComponent } from './credit-notes/credit-note-grid';
import { CreditNoteDetailComponent } from './credit-notes/credit-note-detail/credit-note-detail';
import { DebitNoteGridComponent } from './debit-notes/debit-note-grid';
import { DebitNoteDetailComponent } from './debit-notes/debit-note-detail/debit-note-detail';

enableRipple(true);

@NgModule({
  declarations: [
    CustomerComponent,
    CustomerDetailComponent,
    CustomerMovementsComponent,
    CustomerDocumentPageComponent,
    QuoteGridComponent,
    QuoteDetailComponent,
    SalesOrderGridComponent,
    SalesOrderDetailComponent,
    DeliveryNoteGridComponent,
    DeliveryNoteDetailComponent,
    InvoiceGridComponent,
    InvoiceDetailComponent,
    CreditNoteGridComponent,
    CreditNoteDetailComponent,
    DebitNoteGridComponent,
    DebitNoteDetailComponent,
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
export class CustomerModule {}
