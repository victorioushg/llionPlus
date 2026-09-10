import { Routes } from '@angular/router';
import { CustomerComponent } from './customer-grid';
import { QuoteGridComponent } from './quotes/quote-grid';
import { SalesOrderGridComponent } from './sales-orders/sales-order-grid';
import { DeliveryNoteGridComponent } from './delivery-notes/delivery-note-grid';
import { InvoiceGridComponent } from './invoices/invoice-grid';
import { CreditNoteGridComponent } from './credit-notes/credit-note-grid';
import { DebitNoteGridComponent } from './debit-notes/debit-note-grid';

export const routes: Routes = [
  {
    path: '',
    component: CustomerComponent,
  },
  {
    path: 'quotes',
    component: QuoteGridComponent,
    data: { title: 'Presupuesto' },
  },
  {
    path: 'sales-orders',
    component: SalesOrderGridComponent,
    data: { title: 'Pedidos' },
  },
  {
    path: 'delivery-notes',
    component: DeliveryNoteGridComponent,
    data: { title: 'Notas de entrega' },
  },
  {
    path: 'invoices',
    component: InvoiceGridComponent,
    data: { title: 'Facturas' },
  },
  {
    path: 'credit-notes',
    component: CreditNoteGridComponent,
    data: { title: 'Notas crédito' },
  },
  {
    path: 'debit-notes',
    component: DebitNoteGridComponent,
    data: { title: 'Notas débito' },
  },
];
