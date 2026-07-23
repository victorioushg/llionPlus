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
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { IOrganizationCreditDebit } from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

@Component({
  selector: 'llion-organization-credits',
  templateUrl: './organization-credits.html',
  styleUrls: ['./organization-credits.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationCreditsComponent implements OnInit, OnDestroy {
  @ViewChild('creditsgrid') creditsGrid?: GridComponent;
  @ViewChild('creditForm') creditForm?: NgForm;

  credits$!: Observable<IOrganizationCreditDebit[]>;

  creditsGridHeight = 320;
  readonly creditsGridRowHeight = 36;
  readonly creditsGridHeaderHeight = 32;
  creditsGridEnabled = false;

  creditTypeOptions = [
    { text: 'Crédito', value: 0 },
    { text: 'Débito', value: 1 },
  ];
  creditTypeFields: Object = { text: 'text', value: 'value' };

  creditData: IOrganizationCreditDebit = this.createEmptyCredit();

  creditsToolbar = withToolbarTitle(
    [],
    'Créditos y débitos'
  ) as ToolbarItems[];

  creditsEditSettings: EditSettingsModel = {
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
    this.credits$ = this.organizationService.organizationCredits$;

    this.organizationService.organizationContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((organizationId) => {
        this.selectedOrganizationId = organizationId ?? 0;
        this.applyOrganizationEditState(this.selectedOrganizationId > 0);
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  creditTypeAccessor = (_field: string, data: IOrganizationCreditDebit): string =>
    data?.creditDebitFlag === 1 ? 'Débito' : 'Crédito';

  actionBegin(args: SaveEventArgs): void {
    const needsOrganization =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsOrganization && !this.creditsGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar créditos y débitos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IOrganizationCreditDebit>;
      this.creditData = {
        ...this.createEmptyCredit(),
        ...row,
        organizationId: this.selectedOrganizationId,
        creditDebitFlag: row.creditDebitFlag ?? 0,
        movesInventory: !!row.movesInventory,
        validateSalesUnit: !!row.validateSalesUnit,
        adjustPrice: !!row.adjustPrice,
        goodCondition: !!row.goodCondition,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.creditForm?.valid) {
        const payload: IOrganizationCreditDebit = {
          ...this.creditData,
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ =
          payload.creditDebitId && payload.creditDebitId > 0
            ? this.organizationService.updateCredit(payload)
            : this.organizationService.addCredit(payload);

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
      const row = (args.data ?? {}) as IOrganizationCreditDebit;
      if (row.creditDebitId > 0) {
        this.organizationService
          .deleteCredit(row.creditDebitId)
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
            ? 'Agregar crédito / débito'
            : 'Editar crédito / débito';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const code = form?.elements.namedItem('code') as HTMLInputElement | null;
        code?.focus();
      });
    }
  }

  private applyOrganizationEditState(enabled: boolean): void {
    this.creditsGridEnabled = enabled;
    this.creditsToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Créditos y débitos'
    ) as ToolbarItems[];
    this.creditsEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.creditsGrid) {
      this.creditsGrid.toolbar = this.creditsToolbar;
      this.creditsGrid.editSettings = { ...this.creditsEditSettings };
      if (enabled) {
        this.creditsGrid.element.classList.remove('disablegrid');
      } else {
        this.creditsGrid.element.classList.add('disablegrid');
      }
    }
  }

  private createEmptyCredit(): IOrganizationCreditDebit {
    return {
      creditDebitId: 0,
      code: '',
      description: '',
      creditDebitFlag: 0,
      movesInventory: false,
      validateSalesUnit: false,
      adjustPrice: false,
      goodCondition: false,
      organizationId: this.selectedOrganizationId,
    };
  }
}
