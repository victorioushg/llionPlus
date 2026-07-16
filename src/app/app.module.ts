import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { RouterModule } from '@angular/router';
import { JwtModule } from '@auth0/angular-jwt';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { DialogModule } from '@syncfusion/ej2-angular-popups';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { MaskedTextBoxModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import {
  SidebarModule,
  TreeViewModule,
  TabModule,
} from '@syncfusion/ej2-angular-navigations';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ToastService } from './shared/services/toastService';
import { HttpErrorInterceptor } from './http-error.interceptor';
import { LoadingInterceptor } from '@shared/Interceptors/loading.interceptor';
import { SpinnerService } from '@shared/services/spinner.service';
import { ROUTES } from './_routes';
import { LoginComponent } from '@auth/login/login.component';
import { AppComponent } from './app.component';
import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';

export function tokenGetter() {
  return localStorage.getItem('jwt');
}

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(ROUTES),
    StoreModule.forRoot({}),
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter,
      },
    }),
    DialogModule,
    ButtonModule,
    TextBoxModule,
    MaskedTextBoxModule,
    SidebarModule,
    TreeViewModule,
    FontAwesomeModule,
    TabModule,
  ],
  exports: [RouterModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    ToastService,
    SpinnerService,
    ErrorHandlerService,
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
