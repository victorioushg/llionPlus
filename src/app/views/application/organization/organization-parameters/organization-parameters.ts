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
import {
  IOrganizationParameter,
  IOrigin,
  IParameterType,
} from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

@Component({
  selector: 'llion-organization-parameters',
  templateUrl: './organization-parameters.html',
  styleUrls: ['./organization-parameters.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationParametersComponent implements OnInit, OnDestroy {
  @ViewChild('parametersgrid') parametersGrid?: GridComponent;
  @ViewChild('parameterForm') parameterForm?: NgForm;

  parameters$!: Observable<IOrganizationParameter[]>;
  parameterTypes$!: Observable<IParameterType[]>;
  origins$!: Observable<IOrigin[]>;

  parametersGridHeight = 320;
  readonly parametersGridRowHeight = 36;
  readonly parametersGridHeaderHeight = 32;
  parametersGridEnabled = false;

  parameterTypeFields: Object = {
    text: 'parameterType',
    value: 'parameterType',
  };
  /** Module FK = app_origin.Origin */
  moduleFields: Object = {
    text: 'displayText',
    value: 'origin',
  };

  parameterData: IOrganizationParameter = this.createEmptyParameter();

  parametersToolbar = withToolbarTitle(
    [],
    'Parámetros y contadores'
  ) as ToolbarItems[];

  parametersEditSettings: EditSettingsModel = {
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
    this.parameters$ = this.organizationService.organizationParameters$;
    this.parameterTypes$ = this.organizationService.parameterTypes$;
    this.origins$ = this.organizationService.origins$;

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

    if (needsOrganization && !this.parametersGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe agregar o editar una organización para gestionar parámetros',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IOrganizationParameter>;
      this.parameterData = {
        ...this.createEmptyParameter(),
        ...row,
        organizationId: this.selectedOrganizationId,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.parameterForm?.valid) {
        const payload: IOrganizationParameter = {
          ...this.parameterData,
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ =
          payload.parameterId && payload.parameterId > 0
            ? this.organizationService.updateParameter(payload)
            : this.organizationService.addParameter(payload);

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
      const row = (args.data ?? {}) as IOrganizationParameter;
      if (row.parameterId > 0) {
        this.organizationService
          .deleteParameter(row.parameterId)
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
            ? 'Agregar parámetro'
            : 'Editar parámetro';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const description = form?.elements.namedItem(
          'description'
        ) as HTMLInputElement | null;
        description?.focus();
      });
    }
  }

  private applyOrganizationEditState(editing: boolean): void {
    const enabled = editing && this.selectedOrganizationId > 0;
    this.parametersGridEnabled = enabled;
    this.parametersToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Parámetros y contadores'
    ) as ToolbarItems[];
    this.parametersEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    if (this.parametersGrid) {
      this.parametersGrid.toolbar = this.parametersToolbar;
      this.parametersGrid.editSettings = { ...this.parametersEditSettings };
      if (enabled) {
        this.parametersGrid.element.classList.remove('disablegrid');
      } else {
        this.parametersGrid.element.classList.add('disablegrid');
      }
    }
  }

  private createEmptyParameter(): IOrganizationParameter {
    return {
      parameterId: 0,
      description: '',
      parameterType: '',
      value: '',
      module: '',
      organizationId: this.selectedOrganizationId,
    };
  }
}
