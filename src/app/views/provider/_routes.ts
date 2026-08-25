import { Routes } from '@angular/router';
import { ProviderComponent } from './provider-grid';
import { PurchaseOrderComponent } from './purchase-orders/purchase-order-grid';

export const routes: Routes = [
  {
    path: '',
    component: ProviderComponent,
  },
  {
    path: 'purchase-orders',
    component: PurchaseOrderComponent,
  },
];
