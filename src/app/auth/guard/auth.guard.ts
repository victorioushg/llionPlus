import { Injectable } from '@angular/core';

import {
  Router,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private jwtHelper: JwtHelperService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const token = localStorage.getItem('jwt');

    if (token && !this.jwtHelper.isTokenExpired(token) && this.hasWorkSession()) {
      return true;
    }

    this.router.navigate(['login']);
    return false;
  }

  private hasWorkSession(): boolean {
    const raw = localStorage.getItem('currentLlionUser');
    if (!raw) {
      return false;
    }

    try {
      const sessionId = Number(JSON.parse(raw)?.sessionId ?? 0);
      return sessionId > 0;
    } catch {
      return false;
    }
  }
}
