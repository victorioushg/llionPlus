import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import { fromEvent, Observable, Subject, take, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IOrganizationCounter } from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';

@Component({
  selector: 'llion-organization-counters',
  templateUrl: './organization-counters.html',
  styleUrls: ['./organization-counters.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationCountersComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('countersgrid') countersGrid?: GridComponent;
  @ViewChild('counterForm') counterForm?: NgForm;

  counters$!: Observable<IOrganizationCounter[]>;

  countersGridHeight = 320;
  readonly countersGridRowHeight = 36;
  readonly countersGridHeaderHeight = 32;
  countersGridEnabled = false;

  counterData: IOrganizationCounter = this.createEmptyCounter();

  countersToolbar = withToolbarTitle([], 'Contadores') as ToolbarItems[];

  countersEditSettings: EditSettingsModel = {
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
    this.counters$ = this.organizationService.organizationCounters$;

    this.organizationService.organizationContextIdAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((organizationId) => {
        this.selectedOrganizationId = organizationId ?? 0;
        this.applyOrganizationEditState(this.selectedOrganizationId > 0);
        setTimeout(() => this.updateGridHeight());
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.applyOrganizationEditState(this.selectedOrganizationId > 0);
    this.updateGridHeight();
    fromEvent(window, 'resize')
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(() => this.updateGridHeight());
    setTimeout(() => this.updateGridHeight(), 0);
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

    if (needsOrganization && !this.countersGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar contadores',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IOrganizationCounter>;
      this.counterData = {
        ...this.createEmptyCounter(),
        ...row,
        organizationId: this.selectedOrganizationId,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.counterForm?.valid) {
        const payload: IOrganizationCounter = {
          ...this.counterData,
          organizationId: this.selectedOrganizationId,
        };
        args.data = payload;

        const request$ =
          payload.counterId && payload.counterId > 0
            ? this.organizationService.updateCounter(payload)
            : this.organizationService.addCounter(payload);

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
      const row = (
        Array.isArray(args.data) ? args.data[0] : args.data
      ) as IOrganizationCounter;
      if (row?.counterId > 0) {
        this.organizationService
          .deleteCounter(row.counterId)
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
            ? 'Agregar contador'
            : 'Editar contador';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const description = form?.elements.namedItem(
          'counterDescription'
        ) as HTMLInputElement | null;
        description?.focus();
      });
    }
  }

  private applyOrganizationEditState(enabled: boolean): void {
    this.countersGridEnabled = enabled;
    this.countersToolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete'] : [],
      'Contadores'
    ) as ToolbarItems[];
    this.countersEditSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
      showDeleteConfirmDialog: enabled,
    };

    if (this.countersGrid) {
      this.countersGrid.toolbar = this.countersToolbar;
      this.countersGrid.editSettings = { ...this.countersEditSettings };
      if (enabled) {
        this.countersGrid.element.classList.remove('disablegrid');
      } else {
        this.countersGrid.element.classList.add('disablegrid');
      }
    }
  }

  private updateGridHeight(): void {
    this.countersGridHeight = applyGridHeightAboveFooter(
      this.countersGrid,
      280
    );
    this.cdr.markForCheck();
  }

  private createEmptyCounter(): IOrganizationCounter {
    return {
      counterId: 0,
      counterDescription: '',
      counter: '',
      module: '',
      entityId: null,
      organizationId: this.selectedOrganizationId,
    };
  }
}
