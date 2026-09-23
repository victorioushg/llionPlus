import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ToastService } from '@shared/services/toastService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { toastType } from '@shared/enums/enums';
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

  readonly classes$: Observable<IAccountClass[]> = this.refreshSource.pipe(
    switchMap(() =>
      this.http
        .get<IApiResponse<IAccountClass[]>>(`${this.classUrl}/classes/0`)
        .pipe(
          map((data) =>
            ((data.result ?? []) as Array<IAccountClass & Record<string, unknown>>)
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

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {}

  refresh(): void {
    this.refreshSource.next(this.refreshSource.value + 1);
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
        } else {
          this.toastService.showMyToast(
            'No se pudo guardar la clase',
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
              'No se puede eliminar: la clase tiene subclases',
              toastType.warning
            );
            return;
          }
          if (result > 0) {
            this.toastService.showMyToast(
              `${item.name ?? item.fullName}, datos eliminados`,
              toastType.success
            );
            this.refresh();
            return;
          }
          this.toastService.showMyToast(
            'No se pudo eliminar la clase',
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

  private toPayload(item: IAccountClass): IAccountClass {
    const name = String(item.name ?? '').trim();
    const parentId = Number(item.parentId) || 0;
    return {
      classId: Number(item.classId) || 0,
      name,
      fullName: String(item.fullName ?? name).trim(),
      isActive: item.isActive !== false,
      parentId: parentId > 0 ? parentId : null,
      parentFullName: String(item.parentFullName ?? '').trim() || null,
      subLevel: Number(item.subLevel) || 0,
    };
  }
}
