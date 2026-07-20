import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import { NgForm } from '@angular/forms';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  EMPTY,
  map,
  takeUntil,
} from 'rxjs';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { IEmail } from './email';
import { EmailService } from './email.service';
import { ApplicationService } from '@shared/services/applicattionService';
import { ToastService } from '@shared/services/toastService';
import { sharedSetting, toastType } from '@shared/enums/enums';

@Component({
  selector: 'llion-grid-email',
  templateUrl: './email-grid.html',
  styleUrls: ['./email-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class EmailGridComponent implements OnInit, OnDestroy {
  @ViewChild('emailgrid') emailgrid?: GridComponent;
  @ViewChild('emailForm') emailForm?: NgForm;

  emails$!: Observable<IEmail[]>;
  enabled$!: Observable<boolean>;

  gridHeight = sharedSetting.formGridHeight;
  gridEnabled = false;
  organizationId = 0;
  entityId = 0;

  emailData: IEmail = this.createEmptyEmail();

  toolbar = withToolbarTitle(
    [],
    'Correos electrónicos'
  ) as ToolbarItems[];
  editSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  private readonly destroy$ = new Subject<void>();

  constructor(
    private emailService: EmailService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.enabled$ = this.applicationService.enableEmailChildGridAction$;

    this.emails$ = combineLatest([
      this.emailService.emailWithCRUD$,
      this.applicationService.enableEmailChildGridAction$,
    ]).pipe(
      map(([emails]) => emails.filter(Boolean)),
      catchError((err) => {
        this.toastService.showMyToast(err, toastType.error);
        return EMPTY;
      })
    );

    combineLatest([
      this.applicationService.enableEmailChildGridAction$,
      this.applicationService.organizationIdSelectedAction$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([editing, organizationId]) => {
        this.organizationId = organizationId ?? 0;
        this.gridEnabled = !!editing && this.organizationId > 0;
        this.applyEditState();
        this.cdr.markForCheck();
      });

    this.applicationService.entitySelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((entityId) => {
        this.entityId = entityId ?? 0;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsEditMode =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsEditMode && !this.gridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe editar la organización para gestionar correos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IEmail>;
      this.emailData = {
        ...this.createEmptyEmail(),
        ...row,
        organizationId: this.organizationId,
        entityId: this.entityId || row.entityId || 0,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.emailForm?.valid) {
        const payload: IEmail = {
          ...this.emailData,
          organizationId: this.organizationId,
          entityId: this.entityId,
        };
        args.data = payload;

        if (payload.emailId && payload.emailId > 0) {
          this.emailService.updateEmail(payload);
        } else {
          this.emailService.addEmail(payload);
        }
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IEmail;
      if (row.emailId > 0) {
        this.emailService.deleteEmail(row);
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const dialog = args.dialog as { header?: string } | undefined;
      if (dialog) {
        dialog.header =
          args.requestType === 'add' ? 'Agregar correo' : 'Editar correo';
      }
    }
  }

  private applyEditState(): void {
    const enabled = this.gridEnabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Correos electrónicos'
    ) as ToolbarItems[];
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.emailgrid) {
      this.emailgrid.toolbar = this.toolbar;
      this.emailgrid.editSettings = { ...this.editSettings };
    }
  }

  private createEmptyEmail(): IEmail {
    return {
      emailId: 0,
      emailAddress: '',
      entityId: this.entityId,
      organizationId: this.organizationId,
    };
  }
}
