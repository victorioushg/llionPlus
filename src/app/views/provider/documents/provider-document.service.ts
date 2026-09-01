import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@environments/environment';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  map,
  shareReplay,
  switchMap,
  tap,
  takeUntil,
} from 'rxjs/operators';
import { IApiResponse } from '@shared/models/api-response';
import { ApplicationService } from '@shared/services/applicattionService';
import { ErrorHandlerService } from '@shared/services/errorHandlerService';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { IGroup } from '@shared/models/group';
import { IProviderDocument } from './provider-document';
import {
  IProviderDocumentKindConfig,
  ProviderDocumentKind,
  PROVIDER_DOCUMENT_KINDS,
} from './provider-document-kind';

@Injectable()
export class ProviderDocumentService {
  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/json',
  });
  private readonly configReset$ = new Subject<void>();
  private readonly refreshSubject = new BehaviorSubject<number>(0);
  private readonly selectedIdSource = new BehaviorSubject<number>(0);
  private readonly enabledFormSource = new BehaviorSubject<boolean>(false);

  private static readonly warehouseEntityId = 3;

  config!: IProviderDocumentKindConfig;
  documents$!: Observable<IProviderDocument[]>;
  warehouses$!: Observable<IGroup[]>;
  selectedId$ = this.selectedIdSource.asObservable();
  enableFormAction$ = this.enabledFormSource.asObservable();
  documentSelected$!: Observable<IProviderDocument>;

  get currentOrganizationId(): number {
    return this.applicationService.workingOrganization?.organizationId ?? 0;
  }

  private get apiUrl(): string {
    return environment.API_URL + this.config.apiPath;
  }

  constructor(
    private http: HttpClient,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private errorHandlerService: ErrorHandlerService
  ) {
    this.warehouses$ = this.applicationService.workingOrganization$.pipe(
      switchMap((org) => {
        const organizationId = org?.organizationId ?? 0;
        if (organizationId <= 0) {
          return of([] as IGroup[]);
        }
        return this.http
          .get<IApiResponse<IGroup[]>>(
            `${environment.API_URL}application/groups/Warehouse/${ProviderDocumentService.warehouseEntityId}/${organizationId}`
          )
          .pipe(
            map((data) => this.normalizeWarehouses(data.result ?? [])),
            catchError((err) => {
              this.errorHandlerService.handleError(err);
              return of([] as IGroup[]);
            })
          );
      }),
      shareReplay(1)
    );
  }

  configure(kind: ProviderDocumentKind): void {
    this.configReset$.next();
    this.config = PROVIDER_DOCUMENT_KINDS[kind];
    this.setSelectedId(0);
    this.enableForm(false);
    this.documents$ = this.applicationService.workingOrganization$.pipe(
      switchMap((workingOrg) =>
        this.refreshSubject.pipe(
          switchMap(() => {
            const organizationId = workingOrg?.organizationId ?? 0;
            if (organizationId <= 0) {
              return of([] as IProviderDocument[]);
            }
            return this.http
              .get<IApiResponse<IProviderDocument[]>>(
                `${this.apiUrl}/${organizationId}/0`
              )
              .pipe(
                map((data) => data.result ?? []),
                catchError((err) => {
                  this.errorHandlerService.handleError(err);
                  return of([] as IProviderDocument[]);
                })
              );
          })
        )
      ),
      shareReplay(1)
    );

    this.documentSelected$ = this.selectedIdSource.pipe(
      switchMap((documentId) => {
        if (documentId <= 0) {
          return of(this.createEmptyDocument());
        }
        return this.getDocument(documentId);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.applicationService.workingOrganization$
      .pipe(
        map((org) => org?.organizationId ?? 0),
        distinctUntilChanged(),
        takeUntil(this.configReset$)
      )
      .subscribe(() => {
        this.setSelectedId(0);
        this.enableForm(false);
      });
  }

  setSelectedId(documentId: number): void {
    this.selectedIdSource.next(documentId ?? 0);
  }

  enableForm(enabled: boolean): void {
    this.enabledFormSource.next(enabled);
  }

  createEmptyDocument(): IProviderDocument {
    const today = new Date();
    return {
      documentId: 0,
      documentNumber: '',
      seriesCode: '',
      providerId: null,
      providerCode: '',
      providerName: '',
      issueDate: today,
      issueDateTax: today,
      dueDate: today,
      comment: '',
      referenceNumber: '',
      taxControlNumber: '',
      billNumber: '',
      creditCash: false,
      statusName: '',
      organizationId: this.currentOrganizationId,
      lines: [],
      taxes: [],
      discounts: [],
    };
  }

  refresh(): void {
    this.refreshSubject.next(this.refreshSubject.value + 1);
  }

  deleteDocument(item: IProviderDocument): Observable<number> {
    return this.http
      .delete<IApiResponse<number>>(`${this.apiUrl}/${item.documentId}`, {
        headers: this.headers,
      })
      .pipe(
        tap((data) => {
          const deletedId = Number(data.result) || 0;
          if (deletedId > 0) {
            this.toastService.showMyToast(
              this.config.deleteSuccess,
              toastType.success
            );
            this.setSelectedId(0);
            this.enableForm(false);
            this.refresh();
          } else {
            this.toastService.showMyToast(
              `No se pudo eliminar el documento`,
              toastType.warning
            );
          }
        }),
        map((data) => Number(data.result) || 0),
        catchError((err) => this.errorHandlerService.handleError(err))
      );
  }

  private getDocument(documentId: number): Observable<IProviderDocument> {
    return this.http
      .get<IApiResponse<IProviderDocument>>(
        `${this.apiUrl}/document/${documentId}`
      )
      .pipe(
        map((data) => this.normalizeDocument(data.result)),
        catchError((err) => {
          if (err instanceof HttpErrorResponse && err.status === 404) {
            return of(this.createEmptyDocument());
          }
          this.errorHandlerService.handleError(err);
          return of(this.createEmptyDocument());
        })
      );
  }

  private normalizeDocument(
    row: IProviderDocument | null | undefined
  ): IProviderDocument {
    if (!row) {
      return this.createEmptyDocument();
    }
    return {
      ...this.createEmptyDocument(),
      ...row,
      documentId: Number(row.documentId) || 0,
      lines: row.lines ?? [],
      taxes: row.taxes ?? [],
      discounts: row.discounts ?? [],
    };
  }

  private normalizeWarehouses(rows: IGroup[]): IGroup[] {
    return (rows ?? []).map((row) => {
      const anyRow = row as IGroup & Record<string, unknown>;
      const description = String(
        anyRow.description ?? anyRow['Description'] ?? ''
      );
      const fullName = String(
        anyRow.fullName ??
          anyRow['FullName'] ??
          anyRow['fullDescription'] ??
          anyRow['FullDescription'] ??
          description
      );
      return {
        ...row,
        groupId: Number(anyRow.groupId ?? anyRow['GroupId'] ?? 0),
        description,
        fullName: fullName || description,
        altern_GroupCode: String(
          anyRow.altern_GroupCode ??
            anyRow['Altern_GroupCode'] ??
            anyRow['altern_groupCode'] ??
            ''
        ),
        parent_GroupCode: Number(
          anyRow.parent_GroupCode ?? anyRow['Parent_GroupCode'] ?? 0
        ),
        groupModule: String(anyRow.groupModule ?? anyRow['GroupModule'] ?? ''),
        entityId: Number(anyRow.entityId ?? anyRow['EntityId'] ?? 0),
        organizationId: Number(
          anyRow.organizationId ?? anyRow['OrganizationId'] ?? 0
        ),
      };
    });
  }
}
