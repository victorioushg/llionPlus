import { Routes } from '@angular/router';
import { TreasuryComponent } from './treasury-grid';
import { TREASURY_TYPE_BANK, TREASURY_TYPE_CASHBOX } from './treasury';

export const routes: Routes = [
  {
    path: 'banks',
    component: TreasuryComponent,
    data: { treasuryType: TREASURY_TYPE_BANK },
  },
  {
    path: 'cashboxes',
    component: TreasuryComponent,
    data: { treasuryType: TREASURY_TYPE_CASHBOX },
  },
  {
    path: '',
    redirectTo: 'banks',
    pathMatch: 'full',
  },
];
