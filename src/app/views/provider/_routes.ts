import { Routes } from '@angular/router';
import { ProviderComponent } from './provider-grid';
import { PurchaseOrderComponent } from './purchase-orders/purchase-order-grid';
import { GoodsReceiptComponent } from './goods-receipts/goods-receipt-grid';
import { ProviderDocumentGridComponent } from './documents/provider-document-grid';

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
    component: ProviderDocumentGridComponent,
    data: { kind: 'purchase' },
  },
  {
    path: 'credit-notes',
    component: ProviderDocumentGridComponent,
    data: { kind: 'creditNote' },
  },
  {
    path: 'debit-notes',
    component: ProviderDocumentGridComponent,
    data: { kind: 'debitNote' },
  },
];
