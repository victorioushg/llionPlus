import { AuthGuard } from '@auth/guard/auth.guard';
import { LoginComponent } from '@auth/login/login.component';
import { Routes } from '@angular/router';

export const ROUTES: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '',
    loadChildren: () =>
      import('@views/views.module').then((m) => m.ViewsModule),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    component: LoginComponent,
  },
];
