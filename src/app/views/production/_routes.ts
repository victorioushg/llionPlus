import { Routes } from '@angular/router';
import { ProductLineComponent } from '@views/production/product-lines/product-line-grid';
import { ResourceComponent } from '@views/production/resources/resource-grid';
import { FormulationComponent } from '@views/production/formulations/formulation-grid';
import { ProductionOrderComponent } from '@views/production/orders/production-order-grid';
import { ProductionTrackingComponent } from '@views/production/tracking/production-tracking-grid';

export const routes: Routes = [
  {
    path: 'lines',
    component: ProductLineComponent,
  },
  {
    path: 'resources',
    component: ResourceComponent,
  },
  {
    path: 'formulations',
    component: FormulationComponent,
  },
  {
    path: 'orders',
    component: ProductionOrderComponent,
  },
  {
    path: 'tracking',
    component: ProductionTrackingComponent,
  },
  {
    path: '',
    redirectTo: 'formulations',
    pathMatch: 'full',
  },
];
