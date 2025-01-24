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
      // {
      //   path: 'accounting/accounts',
      //   loadChildren: () =>
      //     import('@app/views/accounting/accounts/accounts.module').then(
      //       (m) => m.AccountsModule
      //     ),
      // },
      // {
      //   path: 'accounting/classes',
      //   loadChildren: () =>
      //     import('@app/views/accounting/classes/classes.module').then(
      //       (m) => m.ClassesModule
      //     ),
      // },
      // {
      //   path: 'control/parameters',
      //   loadChildren: () =>
      //     import(
      //       '@app/views/control/parameters/parameters.module'
      //     ).then((m) => m.ParametersModule),
      // },
      {
         path: 'application/organization',
         loadChildren: () =>
           import(
             '@views/application/organization/organization.module'
           ).then((m) => m.OrganizationModule),
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
