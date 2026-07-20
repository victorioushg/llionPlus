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
import { Observable, Subject, combineLatest, take, takeUntil } from 'rxjs';
import { IOrganizationTaxRetention } from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

@Component({
  selector: 'llion-organization-retentions',
  templateUrl: './organization-retentions.html',
  styleUrls: ['./organization-retentions.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationRetentionsComponent implements OnInit, OnDestroy {
  @ViewChild('retentionsgrid') retentionsGrid?: GridComponent;
  @ViewChild('retentionForm') retentionForm?: NgForm;

  retentions$!: Observable<IOrganizationTaxRetention[]>;

  retentionsGridHeight = 320;
  readonly retentionsGridRowHeight = 36;
  readonly retentionsGridHeaderHeight = 32;
  retentionsGridEnabled = false;

  retentionData: IOrganizationTaxRetention = this.createEmptyRetention();

  retentionsToolbar = withToolbarTitle([], 'Retenciones') as ToolbarItems[];

  retentionsEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  private selectedOrganizationId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.retentions$ = this.organizationService.organizationTaxRetentions$;

    combineLatest([
      this.organizationService.organizationContextIdAction$,
      this.organizationService.enableOrganizationFormAction$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([organizationId, editing]) => {
        this.selectedOrganizationId = organizationId ?? 0;
        this.applyOrganizationEditState(!!editing);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsOrganization =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsOrganization && !this.retentionsGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe agregar o editar una organización para gestionar retenciones',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IOrganizationTaxRetention>;
      this.retentionData = {
        ...this.createEmptyRetention(),
        ...row,
        organizationId: this.selectedOrganizationId,
        accumulated: !!row.accumulated,
        taxBaseRate: row.taxBaseRate ?? null,
        taxRate: row.taxRate ?? null,
        minPaymentAmount: row.minPaymentAmount ?? null,
        substratedAmount: row.substratedAmount ?? null,
        accountId: row.accountId ?? null,
        classId: row.classId ?? null,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.retentionForm?.valid) {
        const payload: IOrganizationTaxRetention = {
          ...this.retentionData,
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ =
          payload.taxRetentionId && payload.taxRetentionId > 0
            ? this.organizationService.updateRetention(payload)
            : this.organizationService.addRetention(payload);

        request$.pipe(take(1)).subscribe({
          error: () => {
            args.cancel = true;
          },
        });
      } else {
        args.cancel = true;
      }
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IOrganizationTaxRetention;
      if (row.taxRetentionId > 0) {
        this.organizationService
          .deleteRetention(row.taxRetentionId)
          .pipe(take(1))
          .subscribe({
            error: () => {
              args.cancel = true;
            },
          });
      }
    }
  }

  actionComplete(args: DialogEditEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const dialog = args.dialog as { header?: string } | undefined;
      if (dialog) {
        dialog.header =
          args.requestType === 'add'
            ? 'Agregar retención'
            : 'Editar retención';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const code = form?.elements.namedItem(
          'retentionCode'
        ) as HTMLInputElement | null;
        code?.focus();
      });
    }
  }

  private applyOrganizationEditState(editing: boolean): void {
    const enabled = editing && this.selectedOrganizationId > 0;
    this.retentionsGridEnabled = enabled;
    this.retentionsToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Retenciones'
    ) as ToolbarItems[];
    this.retentionsEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.retentionsGrid) {
      this.retentionsGrid.toolbar = this.retentionsToolbar;
      this.retentionsGrid.editSettings = { ...this.retentionsEditSettings };
      if (enabled) {
        this.retentionsGrid.element.classList.remove('disablegrid');
      } else {
        this.retentionsGrid.element.classList.add('disablegrid');
      }
    }
  }

  private createEmptyRetention(): IOrganizationTaxRetention {
    return {
      taxRetentionId: 0,
      retentionCode: '',
      description: '',
      taxBaseRate: null,
      taxRate: null,
      minPaymentAmount: null,
      substratedAmount: null,
      taxerType: '',
      accumulated: false,
      retentionType: '',
      comment: '',
      accountId: null,
      classId: null,
      organizationId: this.selectedOrganizationId,
    };
  }
}
