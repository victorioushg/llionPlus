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
import {
  ICurrency,
  IOrganizationExchangeRate,
} from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

@Component({
  selector: 'llion-organization-exchanges',
  templateUrl: './organization-exchanges.html',
  styleUrls: ['./organization-exchanges.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationExchangesComponent implements OnInit, OnDestroy {
  @ViewChild('exchangesgrid') exchangesGrid?: GridComponent;
  @ViewChild('exchangeForm') exchangeForm?: NgForm;

  exchangeRates$!: Observable<IOrganizationExchangeRate[]>;
  currencies$!: Observable<ICurrency[]>;

  exchangesGridHeight = 320;
  readonly exchangesGridRowHeight = 36;
  readonly exchangesGridHeaderHeight = 32;
  exchangesGridEnabled = false;

  currencyFields: Object = { text: 'currency', value: 'alphabeticCode' };
  private isNewRecord = true;

  exchangeData: IOrganizationExchangeRate = this.createEmptyExchange();

  exchangesToolbar = withToolbarTitle(
    ['Search'],
    'Monedas y cambios'
  ) as ToolbarItems[];

  exchangesEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };
  searchSettings = { operator: 'contains' as const };

  private selectedOrganizationId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.exchangeRates$ = this.organizationService.organizationExchangeRates$;
    this.currencies$ = this.organizationService.currencies$;

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

  actionBegin(args: SaveEventArgs): void {
    const needsOrganization =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsOrganization && !this.exchangesGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar monedas y cambios',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      this.isNewRecord = args.requestType === 'add';
      const row = (args.rowData ?? {}) as Partial<IOrganizationExchangeRate>;
      this.exchangeData = {
        ...this.createEmptyExchange(),
        ...row,
        organizationId: this.selectedOrganizationId,
        interchangeDate: row.interchangeDate
          ? new Date(row.interchangeDate)
          : new Date(),
        amount: row.amount ?? 0,
        originalInterchangeDate: row.interchangeDate
          ? new Date(row.interchangeDate)
          : null,
        originalCurrency: row.currency ?? null,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.exchangeForm?.valid) {
        const payload: IOrganizationExchangeRate = {
          ...this.exchangeData,
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ = this.isNewRecord
          ? this.organizationService.addExchange(payload)
          : this.organizationService.updateExchange(payload);

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
      const row = (args.data ?? {}) as IOrganizationExchangeRate;
      if (row.currency && row.interchangeDate) {
        this.organizationService
          .deleteExchange(row)
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
            ? 'Agregar tipo de cambio'
            : 'Editar tipo de cambio';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const currency = form?.elements.namedItem(
          'currency'
        ) as HTMLInputElement | null;
        currency?.focus();
      });
    }
  }

  private applyOrganizationEditState(enabled: boolean): void {
    this.exchangesGridEnabled = enabled;
    this.exchangesToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete', 'Search'] : ['Search'],
      'Monedas y cambios'
    ) as ToolbarItems[];
    this.exchangesEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.exchangesGrid) {
      this.exchangesGrid.toolbar = this.exchangesToolbar;
      this.exchangesGrid.editSettings = { ...this.exchangesEditSettings };
      if (enabled) {
        this.exchangesGrid.element.classList.remove('disablegrid');
      } else {
        this.exchangesGrid.element.classList.add('disablegrid');
      }
    }
  }

  private createEmptyExchange(): IOrganizationExchangeRate {
    return {
      rowKey: '',
      organizationId: this.selectedOrganizationId,
      currency: '',
      amount: 0,
      interchangeDate: new Date(),
      originalInterchangeDate: null,
      originalCurrency: null,
    };
  }
}
