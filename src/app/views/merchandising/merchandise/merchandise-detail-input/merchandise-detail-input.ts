import {
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
  IEditCell,
  SaveEventArgs,
} from '@syncfusion/ej2-angular-grids';
import { Query } from '@syncfusion/ej2-data';
import { Observable, Subject, take, takeUntil } from 'rxjs';
import { IMerchandiseCode, IMerchandiseUom } from '../merchandise';
import { MerchandiseService } from '../merchandise.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';

/** Dropdown option: property name must match column field for Syncfusion dropdownedit. */
interface ICodeTypeOption {
  merchandiseCodeType: string;
}

@Component({
  selector: 'llion-merchandise-detail-input',
  templateUrl: './merchandise-detail-input.html',
  styleUrls: ['./merchandise-detail-input.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  host: {
    '[class.codes-only-host]': 'codesOnly',
  },
})
export class MerchandiseDetailInputComponent implements OnInit, OnDestroy {
  /** When true (servicios), hide UOM/equivalencia grid and show codes only. */
  @Input() codesOnly = false;

  @ViewChild('uomgrid') uomGrid?: GridComponent;
  @ViewChild('codesgrid') codesGrid?: GridComponent;

  uomData$!: Observable<IMerchandiseUom[]>;
  codesData$!: Observable<IMerchandiseCode[]>;
  codeTypeOptions: ICodeTypeOption[] = [];
  uomGridHeight = 150;
  codesGridHeight = 135;

  /**
   * Syncfusion dropdownedit requires fields.value === column.field
   * and dataSource items that expose that same property.
   */
  codeTypeEditParams: IEditCell = {
    params: {
      allowFiltering: true,
      dataSource: [],
      fields: { text: 'merchandiseCodeType', value: 'merchandiseCodeType' },
      query: new Query(),
      placeholder: 'Tipo de código',
      popupHeight: '220px',
      popupWidth: '220px',
    },
  };

  uomToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
    'Unidad Venta/Equivalencia'
  );
  codesToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
    'Códigos'
  );

  uomEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top',
  };

  codesEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Normal',
    newRowPosition: 'Top',
  };

  private selectedMerchandiseId = 0;
  private organizationId = 1;
  private editingOriginalCode = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private merchandiseService: MerchandiseService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.codesOnly) {
      this.codesGridHeight = 200;
      this.codesToolbar = withToolbarTitle(
        ['Add', 'Edit', 'Delete', 'Update', 'Cancel'],
        'Códigos de servicio'
      );
    }

    this.uomData$ = this.merchandiseService.merchandiseUom$;
    this.codesData$ = this.merchandiseService.merchandiseCodes$;
    this.organizationId = this.merchandiseService.currentOrganizationId;

    this.merchandiseService.codeTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.codeTypeOptions = (types ?? [])
            .map((t) => String(t.description ?? '').trim())
            .filter((description) => !!description)
            .map((description) => ({ merchandiseCodeType: description }));
          this.applyCodeTypeDataSource();
          this.cdr.markForCheck();
        },
        error: () => {
          this.codeTypeOptions = [];
          this.cdr.markForCheck();
        },
      });

    this.merchandiseService.merchandiseSelectedAction$
      .pipe(takeUntil(this.destroy$))
      .subscribe((merchandiseId) => {
        this.selectedMerchandiseId = merchandiseId ?? 0;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  codesActionBegin(args: SaveEventArgs): void {
    const needsMerchandise =
      args.requestType === 'add' ||
      args.requestType === 'beginEdit' ||
      args.requestType === 'save' ||
      args.requestType === 'delete';

    if (needsMerchandise && this.selectedMerchandiseId <= 0) {
      args.cancel = true;
      this.toastService.showMyToast(
        this.merchandiseService.isServiceCatalog
          ? 'Debe seleccionar un servicio para gestionar códigos'
          : 'Debe seleccionar una mercancía para gestionar códigos',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      this.applyCodeTypeDataSource();
    }

    if (args.requestType === 'beginEdit') {
      const row = (args.rowData ?? {}) as Partial<IMerchandiseCode>;
      this.editingOriginalCode = (row.code ?? '').trim();
    }

    if (args.requestType === 'add') {
      this.editingOriginalCode = '';
      const row = (args.data ?? args.rowData ?? {}) as Partial<IMerchandiseCode>;
      args.data = {
        ...row,
        merchandiseId: this.selectedMerchandiseId,
        organizationId: this.organizationId,
      };
    }

    if (args.requestType === 'save') {
      const row = (args.data ?? {}) as IMerchandiseCode;
      const payload = this.buildCodePayload(row);

      if (!payload.code) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Debe indicar el código',
          toastType.warning
        );
        return;
      }

      if (!payload.merchandiseCodeType) {
        args.cancel = true;
        this.toastService.showMyToast(
          'Debe indicar el tipo de código',
          toastType.warning
        );
        return;
      }

      const isUpdate = !!this.editingOriginalCode;
      const request$ = isUpdate
        ? this.merchandiseService.updateMerchandiseCode(payload)
        : this.merchandiseService.addMerchandiseCode(payload);

      request$.pipe(take(1)).subscribe({
        next: () => {
          this.merchandiseService.refreshCodes();
          this.cdr.markForCheck();
        },
        error: () => {
          args.cancel = true;
          this.merchandiseService.refreshCodes();
        },
      });
    }

    if (args.requestType === 'delete') {
      const row = (args.data ?? {}) as IMerchandiseCode | IMerchandiseCode[];
      const item = Array.isArray(row) ? row[0] : row;
      if (!item?.code) {
        args.cancel = true;
        return;
      }

      this.merchandiseService
        .deleteMerchandiseCode({
          ...item,
          code: String(item.code).trim(),
          merchandiseId: item.merchandiseId ?? this.selectedMerchandiseId,
          organizationId: this.organizationId,
        })
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.merchandiseService.refreshCodes();
            this.cdr.markForCheck();
          },
          error: () => {
            args.cancel = true;
            this.merchandiseService.refreshCodes();
          },
        });
    }
  }

  private buildCodePayload(row: IMerchandiseCode): IMerchandiseCode {
    const code = String(row.code ?? '').trim();
    return {
      merchandiseId: this.selectedMerchandiseId,
      code,
      merchandiseCodeType: String(row.merchandiseCodeType ?? '').trim(),
      description: String(row.description ?? '').trim() || null,
      organizationId: this.organizationId,
      originalCode: this.editingOriginalCode || code,
    };
  }

  private applyCodeTypeDataSource(): void {
    const dataSource = this.codeTypeOptions as unknown as {
      [key: string]: Object;
    }[];
    const params = this.codeTypeEditParams.params as {
      dataSource?: typeof dataSource;
      query?: Query;
    };
    params.dataSource = dataSource;
    params.query = new Query();

    const column = this.codesGrid?.getColumnByField?.('merchandiseCodeType');
    if (column?.edit?.params) {
      const columnParams = column.edit.params as {
        dataSource?: typeof dataSource;
        query?: Query;
      };
      columnParams.dataSource = dataSource;
      columnParams.query = new Query();
    }
  }
}
