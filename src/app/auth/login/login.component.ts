import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoginModel } from '@shared/models/Login';
import { enableRipple } from '@syncfusion/ej2-base';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { AuthenticatedResponse } from '@shared/models/authenticated-response.model';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';

@Component({
  selector: 'llion-login',
  templateUrl: 'login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  invalidLogin: boolean = true;
  loginError: string = '';
  loginForm!: FormGroup;
  credentials: LoginModel = { username: '', password: '' };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private toast: ToastService
  ) {
    enableRipple(true);
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  onLogin() {
    if (!this.loginForm.invalid) {
      this.credentials.username = this.loginForm.get('username')?.value;
      this.credentials.password = this.loginForm.get('password')?.value;
      this.http
        .post<AuthenticatedResponse>(
          'https://localhost:44382/api/auth/login',
          this.credentials,
          {
            headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
          }
        )
        .subscribe({
          next: (response: AuthenticatedResponse) => {
            const token = response.token;
            localStorage.setItem('jwt', token);
            this.credentials.password = '';
            localStorage.setItem(
              'currentLlionUser',
              JSON.stringify(this.credentials)
            );
            this.invalidLogin = false;
            this.router.navigate(['/']);
          },
          error: (err: HttpErrorResponse) => {
            this.invalidLogin = true;
            this.toast.showMyToast(
               'Verifique conexión ' +  (err.status != undefined ? err.status : '' ) + ' : ' 
               + (err.statusText != undefined ? err.statusText : ''  ),
               toastType.error
            );
          },
        });
    } else {
      this.invalidLogin = true;
      this.toast.showMyToast(
        'Usuario y/o Contraseña invalidos!',
        toastType.error
      );
    }
  }

  onReset() {
    this.invalidLogin = false;
    this.loginForm.reset();
  }
}
