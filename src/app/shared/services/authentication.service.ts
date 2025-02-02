import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import jwt_decode  from 'jwt-decode';

import { User } from '@shared/models/User';
import { ErrorHandlerService } from './errorHandlerService';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  currentUserRef: User = new User();

  constructor(
    private http: HttpClient,
    private errorhandlerService: ErrorHandlerService
  ) {}

  public get currentUser() {
    return this.currentUserRef;
  }

  getToken(): string {
    return this.currentUser.token; // localStorage.getItem(TOKEN_NAME);
  }

  getTokenExpirationDate(token: string): Date {
    const decoded: any = jwt_decode(token);

    if (decoded.exp === undefined) {
      return new Date();
    }

    const date = new Date(0);
    date.setUTCSeconds(decoded.exp);
    return date;
  }

  isTokenExpired(token?: string): boolean {
    if (!token) {
      token = this.getToken();
    }
    if (!token) {
      return true;
    }

    const date = this.getTokenExpirationDate(token);
    if (date === undefined) {
      return false;
    }
    return !(date.valueOf() > new Date().valueOf());
  }

  login(userName: string, pass: string): Observable<any> {
    const credentials = Object.freeze({
      username: userName,
      password: pass,
      token: '',
    });

    this.currentUserRef = credentials;

    return this.http
      .post('https://localhost:44382/api/Auth/login', credentials) // TODO : Global Variables
      .pipe(
        tap((response) => {
          this.currentUserRef = {
            username: userName,
            password: '',
            token: String((response as any).token),
          };
          localStorage.setItem(
            'currentLlionUser',
            JSON.stringify(this.currentUserRef)
          );
        }),
        catchError(this.errorhandlerService.handleError)
      );
  }

  logout() {
    localStorage.removeItem('currentLlionUser');
  }
}
