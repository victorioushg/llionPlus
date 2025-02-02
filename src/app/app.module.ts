import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { StoreModule } from '@ngrx/store';
import { RouterModule } from '@angular/router';
import { JwtModule } from '@auth0/angular-jwt';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { MaskedTextBoxModule, TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import {
  SidebarModule,
  TreeViewModule,
  TabComponent,
  TabItemsDirective,
  TabItemDirective,
  TabModule,
} from '@syncfusion/ej2-angular-navigations';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ToastService } from './shared/services/toastService';
import { HttpErrorInterceptor } from './http-error.interceptor';
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
    LoginComponent
  ], // Only declare non-standalone components
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
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    ErrorHandlerService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpErrorInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent], 
})
export class AppModule {}
