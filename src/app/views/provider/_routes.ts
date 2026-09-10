import { Routes } from '@angular/router';
import { ProviderComponent } from './provider-grid';
import { PurchaseOrderComponent } from './purchase-orders/purchase-order-grid';
import { GoodsReceiptComponent } from './goods-receipts/goods-receipt-grid';
import { PurchaseComponent } from './purchases/purchase-grid';
import { CreditNoteComponent } from './credit-notes/credit-note-grid';
import { DebitNoteComponent } from './debit-notes/debit-note-grid';

export const routes: Routes = [
  {
    path: '',
    component: ProviderComponent,
  },
  {
    path: 'purchase-orders',
    component: PurchaseOrderComponent,
  },
  {
    path: 'goods-receipts',
    component: GoodsReceiptComponent,
  },
  {
    path: 'purchases',
    component: PurchaseComponent,
  },
  {
    path: 'credit-notes',
    component: CreditNoteComponent,
  },
  {
    path: 'debit-notes',
    component: DebitNoteComponent,
  },
];
