import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  take,
  tap,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IAccount } from '@views/accounting/accounts/account';
import { AccountsService } from '@views/accounting/accounts/accounts.service';
import {
  IJournalEntry,
  IJournalEntryAccount,
  IJournalEntryLine,
  isJournalEntryLocked,
  journalLineDisplay,
} from './journal-entry';

@Injectable({
  providedIn: 'root',
})
export class JournalEntryService {
  private readonly journalUrl = environment.API_URL + 'journalentries';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedIdSource = new BehaviorSubject<number>(0);
  private readonly draftSource = new BehaviorSubject<IJournalEntry | null>(null);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  readonly emptyJournalEntry: IJournalEntry = {
    journalEntryId: 0,
    journalEntryCode: '',
    journalEntryDate: null,
    description: '',
    debits: 0,
    credits: 0,
    actual: false,
    entryKind: 'Diferido',
    lockDate: null,
    fiscalPeriod: null,
    fiscalPeriodName: 'Periodo Actual',
    organizationId: 0,
    lines: [],
  };

  journalEntries$!: Observable<IJournalEntry[]>;
  selectedId$ = this.selectedIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  journalEntrySelected$!: Observable<IJournalEntry>;
  accounts$!: Observable<IJournalEntryAccount[]>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private accountsService: AccountsService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.journalEntries$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IJournalEntry[]);
            }
            return this.http
              .get<IApiResponse<IJournalEntry[]>>(
                `${this.journalUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => (data.result ?? []).map((row) => this.normalizeListRow(row))),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IJournalEntry[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.journalEntrySelected$ = combineLatest([
      this.selectedIdSource,
      this.draftSource,
    ]).pipe(
      switchMap(([id, draft]) => {
        if (id <= 0) {
          return of(draft ?? this.createEmptyJournalEntry());
        }
        return this.getJournalEntryDocument(id);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.accounts$ = this.accountsService.accounts$.pipe(
      map((rows) => this.mapAccounts(rows)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.draftSource.next(null);
        this.setSelectedId(0);
        this.enableForm(false);
      });
  }

  setSelectedId(journalEntryId: number): void {
    if ((journalEntryId ?? 0) > 0) {
      this.draftSource.next(null);
    }
    this.selectedIdSource.next(journalEntryId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  cancelEdit(): void {
    const id = this.selectedIdSource.value;
    this.enableForm(false);
    if (id <= 0) {
      this.draftSource.next(null);
      return;
    }
    this.selectedIdSource.next(0);
    this.selectedIdSource.next(id);
  }

  beginNewJournalEntry(): void {
    const organizationId = this.currentOrganizationId;
    if (organizationId <= 0) {
      this.toastService.showMyToast(
        'Seleccione una organización',
        toastType.warning
      );
      return;
    }

    this.getNextCode(organizationId)
      .pipe(take(1))
      .subscribe((code) => {
        if (!code) {
          this.toastService.showMyToast(
            'No se pudo obtener el número de asiento',
            toastType.warning
          );
          return;
        }
        this.draftSource.next({
          ...this.createEmptyJournalEntry(),
          journalEntryCode: code,
        });
        this.setSelectedId(0);
        this.enableForm(true);
      });
  }

  getNextCode(organizationId: number): Observable<string> {
    return this.http
      .get<IApiResponse<{ code: string } | string>>(
        `${this.journalUrl}/next/${organizationId}`
      )
      .pipe(
        map((data) => {
          const raw = data.result;
          if (typeof raw === 'string') {
            return raw.trim();
          }
          return (raw?.code ?? '').trim();
        }),
        catchError((err) => {
          this.errorHandlerService.handleError(err);
          return of('');
        })
      );
  }

  createEmptyJournalEntry(): IJournalEntry {
    const today = this.startOfDay(new Date());
    return {
      ...this.emptyJournalEntry,
      journalEntryDate: today,
      actual: false,
      entryKind: 'Diferido',
      fiscalPeriod: null,
      fiscalPeriodName: 'Periodo Actual',
      organizationId: this.currentOrganizationId,
      lines: [],
    };
  }

  emptyLine(rowNumber = 1): IJournalEntryLine {
    return {
      journalEntryId: 0,
      rowNumber,
      accountId: null,
      accountCode: '',
      accountName: '',
      accountDisplay: '',
      referenceNumber: '',
      memo: '',
      debitCredit: 1,
      amount: 0,
      debit: 0,
      credit: 0,
      sourceRule: 0,
      organizationId: this.currentOrganizationId,
    };
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  saveJournalEntry(entry: IJournalEntry): Observable<number> {
    if ((entry.journalEntryId ?? 0) > 0 && isJournalEntryLocked(entry)) {
      this.toastService.showMyToast(
        'El asiento bloqueado no se puede modificar',
        toastType.warning
      );
      return of(0);
    }

    const request$ =
      (entry.journalEntryId ?? 0) > 0
        ? this.http.put<IApiResponse<number>>(this.journalUrl, entry, {
            headers: this.headers,
          })
        : this.http.post<IApiResponse<number>>(this.journalUrl, entry, {
            headers: this.headers,
          });

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast('Asiento guardado', toastType.success);
          this.enableForm(false);
          this.refresh();
          this.selectedIdSource.next(0);
          this.selectedIdSource.next(savedId);
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar el asiento',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteJournalEntry(item: IJournalEntry): Observable<number> {
    if (isJournalEntryLocked(item)) {
      this.toastService.showMyToast(
        'El asiento bloqueado no se puede eliminar',
        toastType.warning
      );
      return of(0);
    }

    return this.http
      .delete<IApiResponse<number>>(
        `${this.journalUrl}/${item.journalEntryId}`,
        { headers: this.headers }
      )
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              'Asiento eliminado',
              toastType.success
            );
            this.setSelectedId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              'No se pudo eliminar el asiento',
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getJournalEntryDocument(journalEntryId: number): Observable<IJournalEntry> {
    return this.http
      .get<IApiResponse<IJournalEntry>>(
        `${this.journalUrl}/document/${journalEntryId}`
      )
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyJournalEntry());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyJournalEntry());
        })
      );
  }

  private mapAccounts(rows: IAccount[] | null | undefined): IJournalEntryAccount[] {
    return [...(rows ?? [])]
      .map((row) => {
        const accountId = Number(row.accountId) || 0;
        const code = (row.code ?? '').trim();
        const name = (row.name ?? row.fullName ?? row.description ?? '').trim();
        return {
          accountId,
          code,
          name,
          displayName: [code, name].filter((part) => part.length > 0).join(' '),
        };
      })
      .filter((row) => row.accountId > 0)
      .sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' })
      );
  }

  private normalizeListRow(row: IJournalEntry): IJournalEntry {
    return {
      ...this.emptyJournalEntry,
      ...row,
      journalEntryId: Number(row.journalEntryId) || 0,
      journalEntryDate: this.parseDate(row.journalEntryDate),
      lockDate: this.parseDate(row.lockDate),
      actual: this.toBool(row.actual),
      entryKind: this.toBool(row.actual) ? 'Actual' : 'Diferido',
      fiscalPeriod: Number(row.fiscalPeriod) || null,
      fiscalPeriodName: this.periodLabel(row),
      lines: [],
    };
  }

  private normalizeDocument(row: IJournalEntry | null | undefined): IJournalEntry {
    if (!row) {
      return this.createEmptyJournalEntry();
    }
    const lines = (row.lines ?? []).map((line) => this.normalizeLine(line, row.journalEntryId));
    return {
      ...this.emptyJournalEntry,
      ...row,
      journalEntryId: Number(row.journalEntryId) || 0,
      journalEntryDate: this.parseDate(row.journalEntryDate),
      lockDate: this.parseDate(row.lockDate),
      actual: this.toBool(row.actual),
      entryKind: this.toBool(row.actual) ? 'Actual' : 'Diferido',
      fiscalPeriod: Number(row.fiscalPeriod) || null,
      fiscalPeriodName: this.periodLabel(row),
      lines,
    };
  }

  private normalizeLine(
    line: IJournalEntryLine,
    journalEntryId: number
  ): IJournalEntryLine {
    const debitCredit = Number(line.debitCredit) === 0 ? 0 : 1;
    const amount = Number(line.amount) || 0;
    const debit =
      Number(line.debit) || (debitCredit === 1 ? amount : 0);
    const credit =
      Number(line.credit) || (debitCredit === 0 ? amount : 0);
    const normalized: IJournalEntryLine = {
      ...this.emptyLine(line.rowNumber),
      ...line,
      journalEntryId: Number(line.journalEntryId) || journalEntryId || 0,
      rowNumber: Number(line.rowNumber) || 0,
      accountId: Number(line.accountId) || null,
      debitCredit,
      amount: debit > 0 ? debit : credit,
      debit,
      credit,
    };
    normalized.accountDisplay = journalLineDisplay(normalized);
    return normalized;
  }

  private toBool(value: unknown): boolean {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  private periodLabel(row: IJournalEntry): string {
    if (!Number(row.fiscalPeriod)) {
      return 'Periodo Actual';
    }
    const name = (row.fiscalPeriodName ?? '').trim();
    return name && name !== 'Periodo Actual' ? name : String(row.fiscalPeriod);
  }

  private parseDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
}
