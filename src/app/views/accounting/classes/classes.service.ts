import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  catchError,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { toastType } from '@shared/enums/enums';
import { IAccountMovement } from '@views/accounting/accounts/account';
import { IAccountClass } from './class';

@Injectable({
  providedIn: 'root',
})
export class ClassesService {
  private readonly classUrl = environment.API_URL + 'accounts';
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly refreshSource = new BehaviorSubject<number>(0);
  private readonly movementsRefreshSubject = new BehaviorSubject<number>(0);

  private readonly emptyClass: IAccountClass = {
    classId: 0,
    name: '',
    fullName: '',
    isActive: true,
    parentId: null,
    parentFullName: '',
    subLevel: 0,
  };

  private readonly classContextIdSource = new BehaviorSubject<number>(0);
  classContextIdAction$ = this.classContextIdSource.asObservable();

  private readonly enabledClassGridSource = new BehaviorSubject<boolean>(false);
  enableClassGridAction$ = this.enabledClassGridSource.asObservable();

  private readonly enabledClassFormSource = new BehaviorSubject<boolean>(false);
  enableClassFormAction$ = this.enabledClassFormSource.asObservable();

  classes$!: Observable<IAccountClass[]>;
  classSelected$!: Observable<IAccountClass>;
  classMovements$!: Observable<IAccountMovement[]>;

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.initializeObservables();
  }

  private initializeObservables(): void {
    this.classes$ = this.refreshSource.pipe(
      switchMap(() =>
        this.http
          .get<IApiResponse<IAccountClass[]>>(`${this.classUrl}/classes/0`)
          .pipe(
            map((data) =>
              (
                (data.result ?? []) as Array<
                  IAccountClass & Record<string, unknown>
                >
              )
                .map((row) => this.normalize(row))
                .filter((row) => row.classId > 0)
            ),
            catchError((err) => {
              this.errorHandlerService.handleError(err);
              return of([] as IAccountClass[]);
            })
          )
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.classSelected$ = combineLatest([
      this.classes$,
      this.classContextIdAction$,
    ]).pipe(
      map(([classes, classId]) => {
        if (!classId || classId <= 0) {
          return { ...this.emptyClass };
        }
        return (
          classes.find((c) => c.classId === classId) ?? { ...this.emptyClass }
        );
      })
    );

    this.classMovements$ = combineLatest([
      this.classContextIdAction$,
      this.applicationService.workingOrganization$,
      this.movementsRefreshSubject,
    ]).pipe(
      switchMap(([classId, workingOrg]) => {
        const organizationId = workingOrg?.organizationId ?? 0;
        if (!classId || classId <= 0 || organizationId <= 0) {
          return of([] as IAccountMovement[]);
        }
        return this.getClassMovements(classId, organizationId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  setClassContext(classId: number): void {
    this.classContextIdSource.next(classId ?? 0);
  }

  enableClassGrid(enabled: boolean): void {
    this.enabledClassGridSource.next(enabled);
  }

  enableClassForm(enabled: boolean): void {
    this.enabledClassFormSource.next(enabled);
  }

  refresh(): void {
    this.refreshSource.next(this.refreshSource.value + 1);
  }

  refreshMovements(): void {
    this.movementsRefreshSubject.next(this.movementsRefreshSubject.value + 1);
  }

  saveClass(item: IAccountClass): Observable<number> {
    const payload = this.toPayload(item);
    const isNew = payload.classId <= 0;
    const request$ = isNew
      ? this.http.post<IApiResponse<number>>(
          `${this.classUrl}/class`,
          payload,
          { headers: this.headers }
        )
      : this.http.put<IApiResponse<number>>(
          `${this.classUrl}/class`,
          payload,
          { headers: this.headers }
        );

    return request$.pipe(
      tap((data) => {
        const savedId = Number(data.result) || 0;
        if (savedId > 0) {
          this.toastService.showMyToast(
            `${payload.name}, datos almacenados`,
            toastType.success
          );
          this.refresh();
          if (isNew) {
            this.setClassContext(savedId);
          }
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar el centro de costo',
            toastType.warning
          );
        }
      }),
      map((data) => Number(data.result) || 0),
      catchError((err) => this.errorHandlerService.handleError(err))
    );
  }

  deleteClass(item: IAccountClass): Observable<number> {
    const classId = Number(item.classId) || 0;
    return this.http
      .delete<IApiResponse<number>>(`${this.classUrl}/class/${classId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const result = Number(data.result) || 0;
          if (result < 0) {
            this.toastService.showMyToast(
              'No se puede eliminar: el centro de costo tiene subclases',
              toastType.warning
            );
            return;
          }
          if (result > 0) {
            this.toastService.showMyToast(
              `${item.name ?? item.fullName}, datos eliminados`,
              toastType.success
            );
            if (this.classContextIdSource.value === classId) {
              this.setClassContext(0);
            }
            this.refresh();
            return;
          }
          this.toastService.showMyToast(
            'No se pudo eliminar el centro de costo',
            toastType.warning
          );
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  normalize(row: IAccountClass & Record<string, unknown>): IAccountClass {
    const classId = Number(row.classId ?? row['ClassId']) || 0;
    const name = String(row.name ?? row['Name'] ?? '').trim();
    const fullName = String(row.fullName ?? row['FullName'] ?? name).trim();
    const parentId = Number(row.parentId ?? row['ParentId']) || null;
    const parentFullName = String(
      row.parentFullName ?? row['ParentFullName'] ?? ''
    ).trim();
    const isActive = row.isActive ?? row['IsActive'];
    return {
      classId,
      name,
      fullName: fullName || name,
      isActive: isActive !== false && isActive !== 0 && isActive !== '0',
      parentId: parentId && parentId > 0 ? parentId : null,
      parentFullName: parentFullName || null,
      subLevel: Number(row.subLevel ?? row['SubLevel']) || 0,
    };
  }

  private getClassMovements(
    classId: number,
    organizationId: number
  ): Observable<IAccountMovement[]> {
    return this.http
      .get<IApiResponse<Array<IAccountMovement & Record<string, unknown>>>>(
        `${this.classUrl}/class/movements/${classId}/${organizationId}`
      )
      .pipe(
        map((data) =>
          (
            (data.result ?? []) as Array<
              IAccountMovement & Record<string, unknown>
            >
          ).map((row) => this.normalizeMovement(row))
        ),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of([] as IAccountMovement[]);
          }
          return this.errorHandlerService.handleError(err);
        })
      );
  }

  private normalizeMovement(
    row: IAccountMovement & Record<string, unknown>
  ): IAccountMovement {
    const movementType = this.asOptionalBoolean(
      row.movementType ?? row['MovementType']
    );
    return {
      movementId: Number(row.movementId ?? row['MovementId']) || 0,
      accountId: Number(row.accountId ?? row['AccountId']) || null,
      classId: Number(row.classId ?? row['ClassId']) || null,
      movementDate: (row.movementDate ?? row['MovementDate'] ?? null) as
        | Date
        | string
        | null,
      journalDescription: String(
        row.journalDescription ??
          row['journal_Description'] ??
          row['Journal_Description'] ??
          row['JournalDescription'] ??
          ''
      ).trim(),
      reference: String(row.reference ?? row['Reference'] ?? '').trim(),
      movementDescription: String(
        row.movementDescription ?? row['MovementDescription'] ?? ''
      ).trim(),
      movementType,
      movementTypeLabel:
        movementType === true ? 'Debe' : movementType === false ? 'Haber' : '',
      amount: row.amount ?? (row['Amount'] as number | null) ?? null,
      fiscalPeriod: Number(row.fiscalPeriod ?? row['FiscalPeriod']) || null,
      organizationId: Number(row.organizationId ?? row['OrganizationId']) || null,
    };
  }

  private asOptionalBoolean(value: unknown): boolean | null {
    if (value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === false || value === 0 || value === '0') {
      return false;
    }
    return null;
  }

  private toPayload(item: IAccountClass): IAccountClass {
    const name = String(item.name ?? '').trim();
    const parentId = Number(item.parentId) || 0;
    const parentFullName = String(item.parentFullName ?? '').trim();
    return {
      classId: Number(item.classId) || 0,
      name,
      fullName:
        String(item.fullName ?? '').trim() ||
        (parentFullName ? `${parentFullName}:${name}` : name),
      isActive: item.isActive !== false,
      parentId: parentId > 0 ? parentId : null,
      parentFullName: parentFullName || null,
      subLevel: Number(item.subLevel) || 0,
    };
  }
}
