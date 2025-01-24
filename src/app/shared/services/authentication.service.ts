import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import jwt_decode from 'jwt-decode';

import { User } from '@shared/models/User';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  currentUserRef: User = new User;

  constructor(private http: HttpClient) {}

  public get currentUser() {
    return this.currentUserRef;
  }

  getToken(): string {
    return this.currentUser.token; // localStorage.getItem(TOKEN_NAME);
  }

  getTokenExpirationDate(token: string): Date {
    const decoded: any = jwt_decode(token);

    if (decoded.exp === undefined) { return new Date(); }

    const date = new Date(0);
    date.setUTCSeconds(decoded.exp);
    return date;
  }

  isTokenExpired(token?: string): boolean {
    if (!token) { token = this.getToken(); }
    if (!token) { return true; }

    const date = this.getTokenExpirationDate(token);
    if (date === undefined) { return false; }
    return !(date.valueOf() > new Date().valueOf());
  }

  login(userName: string, pass: string): Observable<any> {
    const credentials = Object.freeze({
      username: userName,
      password: pass,
      token: '',
    });

    this.currentUserRef = credentials;

    return (
      this.http
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
          catchError(this.handleError)
        )
    );
  }
  private handleError(err: HttpErrorResponse): Observable<never> {
    // in a real world app, we may send the server to some remote logging infrastructure
    // instead of just logging it to the console
    let errorMessage = '';
    if (err.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      errorMessage = `An error occurred: ${err.error.message}`;
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      errorMessage = `Server returned code: ${err.status}, error message is: ${err.message}`;
    }
    console.error(errorMessage);
    return throwError(errorMessage);
  }
  logout() {
    localStorage.removeItem('currentLlionUser');
  }
}
