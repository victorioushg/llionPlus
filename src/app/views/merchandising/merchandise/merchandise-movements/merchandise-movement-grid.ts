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
  DialogEditEventArgs,
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import { NgForm } from '@angular/forms';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { IMerchandiseMovement } from './merchandisemovement';
import { IMerchandiseUom } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { IGroup } from '@shared/models/group';

@Component({
  selector: 'llion-merchandise-movements',
  templateUrl: './merchandise-movement-grid.html',
  styleUrls: ['./merchandise-movement-grid.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class MerchandiseMovementComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('movementForm') movementForm?: NgForm;
  @ViewChild('grid') grid?: GridComponent;

  movements$!: Observable<IMerchandiseMovement[]>;
  movementTypes$!: Observable<IGroup[]>;
  uoms$!: Observable<IMerchandiseUom[]>;

  screenMovementsHeight = 320;
  readonly rowHeight = 36;
  readonly headerHeight = 32;
  /** Syncfusion tab strip above this grid (merchandise list has no tab). */
  private readonly tabStripHeight = 42;
  gridEnabled = false;

  /**
   * Approximate height from the left merchandise grid content height.
   * Final alignment is refined by alignBottomTo() after layout/resize.
   */
  @Input() set contentHeight(value: number) {
    if (!value || value <= 0) {
      return;
    }
    this.applyContentHeight(
      Math.max(160, value - this.tabStripHeight - this.headerHeight)
    );
  }

  /** Match this grid's bottom edge to the merchandise grid bottom. */
  alignBottomTo(targetBottom: number): void {
    const el = this.grid?.element as HTMLElement | undefined;
    if (!el || !targetBottom) {
      return;
    }

    const top = el.getBoundingClientRect().top;
    if (top <= 0) {
      return;
    }

    const toolbarH =
      (el.querySelector('.e-toolbar') as HTMLElement | null)?.offsetHeight ?? 0;
    const headerH =
      (el.querySelector('.e-gridheader') as HTMLElement | null)?.offsetHeight ??
      this.headerHeight;
    const nextHeight = Math.max(
      160,
      Math.round(targetBottom - top - toolbarH - headerH)
    );
    this.applyContentHeight(nextHeight);
  }

  private applyContentHeight(height: number): void {
    if (this.screenMovementsHeight === height) {
      return;
    }
    this.screenMovementsHeight = height;
    setTimeout(() => {
      if (this.grid) {
        this.grid.height = this.screenMovementsHeight;
        this.grid.refresh();
      }
      this.cdr.markForCheck();
    });
  }

  movementTypeFields: Object = { text: 'description', value: 'description' };
  uomFields: Object = { text: 'uom', value: 'uom' };

  movementData: IMerchandiseMovement = this.createEmptyMovement();

  toolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Search'],
    'Movimientos'
  );
  editSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
  };

  private selectedMerchandiseId = 0;
  private organizationId = 1;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.movements$ = this.merchandiseService.merchandiseMovements$;
    this.movementTypes$ = this.merchandiseService.movementTypes$;
    this.uoms$ = this.merchandiseService.merchandiseUom$;
    this.organizationId = this.merchandiseService.currentOrganizationId;

    // Same UX as precios: allow CRUD when a merchandise is selected.
    this.merchandiseService.merchandiseSelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((merchandiseId) => {
        this.selectedMerchandiseId = merchandiseId ?? 0;
        this.applyEditState(this.selectedMerchandiseId > 0);
        this.cdr.markForCheck();
      });
  }

  ngAfterViewInit(): void {
    this.applyEditState(this.selectedMerchandiseId > 0);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  actionBegin(args: SaveEventArgs): void {
    const needsSelection =
      args.requestType === 'beginEdit' ||
      args.requestType === 'add' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsSelection && this.selectedMerchandiseId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una mercancía para gestionar movimientos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseMovement>;
      this.movementData = {
        ...this.createEmptyMovement(),
        ...row,
        merchandiseId: this.selectedMerchandiseId,
        organizationId: this.organizationId,
        movementDate: row.movementDate
          ? new Date(row.movementDate)
          : new Date(),
        block_Date: row.block_Date ? new Date(row.block_Date) : null,
      };
      this.cdr.markForCheck();
    }

    if (args.requestType === 'save') {
      if (this.movementForm?.valid) {
        const payload: IMerchandiseMovement = {
          ...this.movementData,
          merchandiseId: this.selectedMerchandiseId,
          organizationId: this.organizationId,
        };
        args.data = payload;

        const request$ =
          payload.movementId && payload.movementId > 0
            ? this.merchandiseService.updateMovement(payload)
            : this.merchandiseService.addMovement(payload);

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
      const row = (args.data ?? {}) as IMerchandiseMovement;
      if (row.movementId > 0 && row.merchandiseId > 0) {
        this.merchandiseService
          .deleteMovement(row.movementId, row.merchandiseId)
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
            ? 'Agregar movimiento'
            : 'Editar movimiento';
      }

      setTimeout(() => {
        const form = args.form as HTMLFormElement | undefined;
        const field = form?.elements.namedItem(
          'movementType'
        ) as HTMLInputElement | null;
        field?.focus();
      });
    }
  }

  private applyEditState(enabled: boolean): void {
    this.gridEnabled = enabled;
    this.toolbar = withToolbarTitle(
      enabled ? ['Add', 'Edit', 'Delete', 'Search'] : ['Search'],
      'Movimientos'
    );
    this.editSettings = {
      allowAdding: enabled,
      allowEditing: enabled,
      allowDeleting: enabled,
      mode: 'Dialog',
    };

    // Defer until Syncfusion grid DOM exists (lazy tab).
    setTimeout(() => {
      if (!this.grid?.element) {
        return;
      }
      this.grid.toolbar = this.toolbar;
      this.grid.editSettings = { ...this.editSettings };
      this.grid.element.classList.toggle('disablegrid', !enabled);
      this.cdr.markForCheck();
    });
  }

  private createEmptyMovement(): IMerchandiseMovement {
    return {
      movementId: 0,
      merchandiseId: this.selectedMerchandiseId,
      movementDate: new Date(),
      movementType: '',
      documentNumber: '',
      quantity: null,
      uom: '',
      weight: null,
      organizationId: this.organizationId,
      totalCost: null,
      totalCostWithDiscount: null,
      origin: '',
      documentOrigin: '',
      customer_Provider: null,
      totalSale: null,
      totalSaleWithDiscount: null,
      salesPersonId: null,
      warehouseId: 0,
      accountID: null,
      classId: null,
      block_Date: null,
      createdBy: '',
    };
  }
}
