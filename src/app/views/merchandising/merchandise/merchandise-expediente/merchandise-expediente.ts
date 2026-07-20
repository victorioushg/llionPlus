import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { IMerchandiseMedia, IMerchandiseProfile } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

export type ExpedientePanel = 'media' | 'profile';

@Component({
  selector: 'llion-merchandise-expediente',
  templateUrl: './merchandise-expediente.html',
  styleUrls: ['./merchandise-expediente.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseExpedienteComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /** When set, renders only that grid (organization taxes/retentions pattern). */
  @Input() panel: ExpedientePanel | null = null;

  @ViewChild('mediagrid') mediaGrid?: GridComponent;
  @ViewChild('profilegrid') profileGrid?: GridComponent;

  mediaData$!: Observable<IMerchandiseMedia[]>;
  profilesData$!: Observable<IMerchandiseProfile[]>;

  gridHeight = 280;

  mediaToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
    'Media'
  );
  profileToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
    'Expediente'
  );

  editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top',
  };

  private selectedMerchandiseId = 0;
  private organizationId = 1;
  private editingOriginalFileName = '';
  private editingOriginalProfileDate: Date | null = null;
  private editingOriginalDescription = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  get showProfile(): boolean {
    return this.panel === null || this.panel === 'profile';
  }

  get showMedia(): boolean {
    return this.panel === null || this.panel === 'media';
  }

  ngOnInit(): void {
    this.organizationId = this.merchandiseService.currentOrganizationId;
    this.mediaData$ = this.merchandiseService.merchandiseMedia$;
    this.profilesData$ = this.merchandiseService.merchandiseProfiles$;

    this.merchandiseService.merchandiseSelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((merchandiseId) => {
        this.selectedMerchandiseId = merchandiseId ?? 0;
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.refreshLayouts(), 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refreshLayouts(): void {
    this.mediaGrid?.refresh();
    this.profileGrid?.refresh();
    this.cdr.markForCheck();
  }

  mediaActionBegin(args: SaveEventArgs): void {
    if (!this.ensureMerchandiseSelected(args)) {
      return;
    }

    if (args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseMedia>;
      this.editingOriginalFileName = (row.merchandiseFileName ?? '').trim();
    }

    if (args.requestType === 'add') {
      this.editingOriginalFileName = '';
      const row = (args.data ?? args.rowData ?? {}) as Partial<IMerchandiseMedia>;
      args.data = {
        ...row,
        merchandiseId: this.selectedMerchandiseId,
        merchandiseFileName: row.merchandiseFileName ?? '',
        comment: row.comment ?? '',
        merchandiseDataBase64: '',
      };
    }

    if (args.requestType === 'save') {
      const row = (args.data ?? {}) as IMerchandiseMedia;
      const payload: IMerchandiseMedia = {
        merchandiseId: this.selectedMerchandiseId,
        merchandiseFileName: String(row.merchandiseFileName ?? '').trim(),
        comment: String(row.comment ?? '').trim() || null,
        merchandiseDataBase64: row.merchandiseDataBase64 ?? '',
        originalFileName:
          this.editingOriginalFileName ||
          String(row.merchandiseFileName ?? '').trim(),
      };

      if (!payload.merchandiseFileName) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Debe indicar el nombre del archivo',
          toastType.warning
        );
        return;
      }

      if (!this.editingOriginalFileName && !payload.merchandiseDataBase64) {
        payload.merchandiseDataBase64 = btoa('');
      }

      const isUpdate = !!this.editingOriginalFileName;
      const request$ = isUpdate
        ? this.merchandiseService.updateMerchandiseMedia(payload)
        : this.merchandiseService.addMerchandiseMedia(payload);

      request$.pipe(take(1)).subscribe({
        next: () => this.merchandiseService.refreshMedia(),
        error: () => {
          args.cancel = true;
          this.merchandiseService.refreshMedia();
        },
      });
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IMerchandiseMedia | IMerchandiseMedia[];
      const item = Array.isArray(row) ? row[0] : row;
      if (!item?.merchandiseFileName) {
        args.cancel = true;
        return;
      }

      this.merchandiseService
        .deleteMerchandiseMedia({
          ...item,
          merchandiseId: item.merchandiseId ?? this.selectedMerchandiseId,
        })
        .pipe(take(1))
        .subscribe({
          next: () => this.merchandiseService.refreshMedia(),
          error: () => {
            args.cancel = true;
            this.merchandiseService.refreshMedia();
          },
        });
    }
  }

  profileActionBegin(args: SaveEventArgs): void {
    if (!this.ensureMerchandiseSelected(args)) {
      return;
    }

    if (args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseProfile>;
      this.editingOriginalProfileDate = row.profileDate
        ? new Date(row.profileDate)
        : null;
      this.editingOriginalDescription = row.description ?? '';
    }

    if (args.requestType === 'add') {
      this.editingOriginalProfileDate = null;
      this.editingOriginalDescription = '';
      const row = (args.data ??
        args.rowData ??
        {}) as Partial<IMerchandiseProfile>;
      args.data = {
        ...row,
        merchandiseId: this.selectedMerchandiseId,
        organizationId: this.organizationId,
        profileDate: row.profileDate ? new Date(row.profileDate) : new Date(),
        description: row.description ?? '',
        cause: row.cause ?? 'Insertion',
        deactivated: !!row.deactivated,
      };
    }

    if (args.requestType === 'save') {
      const row = (args.data ?? {}) as IMerchandiseProfile;
      const description = String(row.description ?? '').trim();
      const cause = String(row.cause ?? '').trim();
      const profileDate = row.profileDate
        ? new Date(row.profileDate)
        : new Date();

      if (!description || !cause) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Debe indicar descripción y causa',
          toastType.warning
        );
        return;
      }

      const payload: IMerchandiseProfile = {
        merchandiseId: this.selectedMerchandiseId,
        profileDate,
        description,
        deactivated: !!row.deactivated,
        cause,
        organizationId: this.organizationId,
        originalProfileDate: this.editingOriginalProfileDate ?? profileDate,
        originalDescription: this.editingOriginalDescription || description,
      };

      const isUpdate =
        !!this.editingOriginalDescription || !!this.editingOriginalProfileDate;
      const request$ = isUpdate
        ? this.merchandiseService.updateMerchandiseProfile(payload)
        : this.merchandiseService.addMerchandiseProfile(payload);

      request$.pipe(take(1)).subscribe({
        next: () => this.merchandiseService.refreshProfiles(),
        error: () => {
          args.cancel = true;
          this.merchandiseService.refreshProfiles();
        },
      });
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as
        | IMerchandiseProfile
        | IMerchandiseProfile[];
      const item = Array.isArray(row) ? row[0] : row;
      if (!item) {
        args.cancel = true;
        return;
      }

      this.merchandiseService
        .deleteMerchandiseProfile({
          ...item,
          merchandiseId: item.merchandiseId ?? this.selectedMerchandiseId,
          organizationId: this.organizationId,
        })
        .pipe(take(1))
        .subscribe({
          next: () => this.merchandiseService.refreshProfiles(),
          error: () => {
            args.cancel = true;
            this.merchandiseService.refreshProfiles();
          },
        });
    }
  }

  private ensureMerchandiseSelected(args: SaveEventArgs): boolean {
    const needsMerchandise =
      args.requestType === 'add' ||
      args.requestType === 'beginEdit' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsMerchandise && this.selectedMerchandiseId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una mercancía para gestionar expediente y media',
        toastType.warning
      );
      return false;
    }
    return true;
  }
}
