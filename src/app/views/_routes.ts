import { Routes } from '@angular/router';
import { ViewsComponent } from '@views/views.component';

export const ROUTES: Routes = [
  {
    path: '',
    component: ViewsComponent,
    children: [
      {
        path: '',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: 'accounting/accounts',
        loadChildren: () =>
          import('@views/accounting/accounts/accounts.module').then(
            (m) => m.AccountsModule
          ),
      },
      {
        path: 'treasury',
        loadChildren: () =>
          import('@views/treasury/treasury.module').then(
            (m) => m.TreasuryModule
          ),
      },
      {
        path: 'merchandising/merchandise',
        loadChildren: () =>
          import('@views/merchandising/merchandise/merchandise.module').then(
            (m) => m.MerchandiseModule
          ),
      },
      {
        path: 'merchandising/services',
        loadChildren: () =>
          import('@views/merchandising/merchandise/merchandise.module').then(
            (m) => m.MerchandiseModule
          ),
      },
      {
        path: 'application/organization',
        loadChildren: () =>
          import('@views/application/organization/organization.module').then(
            (m) => m.OrganizationModule
          ),
      },
      {
        path: 'customer',
        loadChildren: () =>
          import('@views/customer/customer.module').then(
            (m) => m.CustomerModule
          ),
      },
      {
        path: 'provider',
        loadChildren: () =>
          import('@views/provider/provider.module').then(
            (m) => m.ProviderModule
          ),
      },
      {
        path: 'employee',
        loadChildren: () =>
          import('@views/employee/employee.module').then(
            (m) => m.EmployeeModule
          ),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('@views/application/users/user.module').then(
            (m) => m.UserModule
          ),
      },
    ],
  },
];
