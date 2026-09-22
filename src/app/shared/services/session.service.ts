import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { IApiResponse } from '@shared/models/api-response';
import {
  IFiscalPrinter,
  fiscalPrinterDisplayName,
} from '@shared/models/fiscal-printer';
import {
  ISessionOpenRequest,
  IUserSession,
} from '@shared/models/user-session';

const MACHINE_KEY = 'llion.machineName';
const PRINTER_BY_ORG_KEY = 'llion.lastPrinterByOrg';
const LAST_ORG_KEY = 'llion.lastOrganizationId';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly authUrl = environment.API_URL + 'auth/';
  private readonly organizationUrl = environment.API_URL + 'organization';
  private readonly jsonHeaders = new HttpHeaders({
    'Content-Type': 'application/json',
  });

  constructor(private http: HttpClient) {}

  getFiscalPrinters(organizationId: number): Observable<IFiscalPrinter[]> {
    return this.http
      .get<IApiResponse<IFiscalPrinter[]>>(
        `${this.organizationUrl}/fiscalprinters/${organizationId}`
      )
      .pipe(
        map((response) =>
          (response.result ?? []).map((printer) => ({
            ...printer,
            displayName: fiscalPrinterDisplayName(printer),
          }))
        )
      );
  }

  getLastSession(
    userId: number,
    organizationId: number
  ): Observable<IUserSession | null> {
    return this.http
      .get<IUserSession>(
        `${this.authUrl}session/last/${userId}/${organizationId}`
      )
      .pipe(catchError(() => of(null)));
  }

  openSession(request: ISessionOpenRequest): Observable<IUserSession> {
    return this.http.post<IUserSession>(`${this.authUrl}session`, request, {
      headers: this.jsonHeaders,
    });
  }

  closeSession(sessionId: number): Observable<unknown> {
    if (!sessionId) {
      return of(null);
    }

    return this.http
      .post(
        `${this.authUrl}session/close`,
        { sessionId },
        { headers: this.jsonHeaders }
      )
      .pipe(catchError(() => of(null)));
  }

  getClientMachineName(): Observable<string> {
    const stored = this.getStoredMachineName();
    if (stored) {
      return of(stored);
    }

    return this.http.get<{ machineName?: string }>(`${this.authUrl}workstation`).pipe(
      map((response) => (response?.machineName || '').trim()),
      catchError(() => of(''))
    );
  }

  getStoredMachineName(): string {
    return (localStorage.getItem(MACHINE_KEY) ?? '').trim();
  }

  getStoredOrganizationId(): number {
    return Number(localStorage.getItem(LAST_ORG_KEY) ?? 0);
  }

  storeOrganizationId(organizationId: number): void {
    if (organizationId > 0) {
      localStorage.setItem(LAST_ORG_KEY, String(organizationId));
    }
  }

  storeMachineName(machineName: string): void {
    const value = (machineName ?? '').trim();
    if (value) {
      localStorage.setItem(MACHINE_KEY, value);
    }
  }

  getStoredPrinterId(organizationId: number): number {
    const raw = localStorage.getItem(PRINTER_BY_ORG_KEY);
    if (!raw) {
      return 0;
    }

    try {
      const map = JSON.parse(raw) as Record<string, number>;
      return Number(map[String(organizationId)] ?? 0);
    } catch {
      return 0;
    }
  }

  storePrinterId(organizationId: number, fiscalPrinterId: number): void {
    if (!organizationId || !fiscalPrinterId) {
      return;
    }

    let map: Record<string, number> = {};
    const raw = localStorage.getItem(PRINTER_BY_ORG_KEY);
    if (raw) {
      try {
        map = JSON.parse(raw) as Record<string, number>;
      } catch {
        map = {};
      }
    }

    map[String(organizationId)] = fiscalPrinterId;
    localStorage.setItem(PRINTER_BY_ORG_KEY, JSON.stringify(map));
  }
}
