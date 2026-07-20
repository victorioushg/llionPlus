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
import { IAppEntity } from '@shared/models/entity';
import { IOrganizationTax } from '../organization';
import { OrganizationService } from '../organization.service';
import { ApplicationService } from '@shared/services/applicattionService';
import { IGroup } from '@shared/models/group';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

@Component({
  selector: 'llion-organization-taxes',
  templateUrl: './organization-taxes.html',
  styleUrls: ['./organization-taxes.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationTaxesComponent implements OnInit, OnDestroy {
  @ViewChild('taxesgrid') taxesGrid?: GridComponent;
  @ViewChild('taxForm') taxForm?: NgForm;

  taxesData$!: Observable<IOrganizationTax[]>;
  taxTypes$!: Observable<IGroup[]>;
  taxesGridHeight = 320;
  readonly taxesGridRowHeight = 36;
  readonly taxesGridHeaderHeight = 32;
  taxesGridEnabled = false;

  entities: IAppEntity[] = [];
  taxTypeFields: Object = { text: 'description', value: 'description' };
  entityFields: Object = { text: 'entityName', value: 'entityName' };

  taxData: IOrganizationTax = this.createEmptyTax();
  applicableToValues: string[] = [];

  taxesToolbar = withToolbarTitle([], 'Impuestos') as ToolbarItems[];

  taxesEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
  };

  private selectedOrganizationId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private organizationService: OrganizationService,
    private applicationService: ApplicationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.taxesData$ = this.organizationService.organizationTaxes$;
    this.taxTypes$ = this.organizationService.taxTypes$;

    this.applicationService.entities$
      .pipe(takeUntil(this.destroy$))
      .subscribe((entities) => {
        this.entities = entities ?? [];
        this.cdr.markForCheck();
      });

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

    if (needsOrganization && !this.taxesGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe agregar o editar una organización para gestionar impuestos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IOrganizationTax>;
      this.taxData = {
        ...this.createEmptyTax(),
        ...row,
        organizationId: this.selectedOrganizationId,
        taxDateFrom: row.taxDateFrom
          ? new Date(row.taxDateFrom)
          : new Date(),
        taxDateTo: row.taxDateTo ? new Date(row.taxDateTo) : null,
        taxBaseAmountFrom: row.taxBaseAmountFrom ?? undefined,
        taxBaseAmountTo: row.taxBaseAmountTo ?? undefined,
      };
      this.applicableToValues = this.parseApplicableTo(row.applicableTo);
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.taxForm?.valid) {
        const payload: IOrganizationTax = {
          ...this.taxData,
          applicableTo: this.serializeApplicableTo(this.applicableToValues),
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ =
          payload.taxId && payload.taxId > 0
            ? this.organizationService.updateTax(payload)
            : this.organizationService.addTax(payload);

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
      const row = (args.data ?? {}) as IOrganizationTax;
      if (row.taxId > 0) {
        this.organizationService
          .deleteTax(row.taxId)
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
            ? 'Agregar impuesto'
            : 'Editar impuesto';
      }

      this.applicationService
        .getEntities()
        .pipe(take(1))
        .subscribe((entities) => {
          this.entities = entities ?? [];
          this.cdr.markForCheck();
        });

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const taxType = form?.elements.namedItem(
          'taxType'
        ) as HTMLInputElement | null;
        taxType?.focus();
      });
    }
  }

  private applyOrganizationEditState(editing: boolean): void {
    const enabled = editing && this.selectedOrganizationId > 0;
    this.taxesGridEnabled = enabled;
    this.taxesToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Impuestos'
    ) as ToolbarItems[];
    this.taxesEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.taxesGrid) {
      this.taxesGrid.toolbar = this.taxesToolbar;
      this.taxesGrid.editSettings = { ...this.taxesEditSettings };
      if (enabled) {
        this.taxesGrid.element.classList.remove('disablegrid');
      } else {
        this.taxesGrid.element.classList.add('disablegrid');
      }
    }
  }

  private parseApplicableTo(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private serializeApplicableTo(values: string[]): string {
    return values.join(',');
  }

  private createEmptyTax(): IOrganizationTax {
    return {
      taxId: 0,
      taxType: '',
      description: '',
      taxDateFrom: new Date(),
      taxDateTo: null,
      rateType: '',
      rate: 0,
      taxBaseAmountFrom: undefined,
      taxBaseAmountTo: undefined,
      organizationId: this.selectedOrganizationId,
      applicableTo: '',
    };
  }
}
