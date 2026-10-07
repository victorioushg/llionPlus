import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, NgForm, Validators } from '@angular/forms';
import { ChangeEventArgs } from '@syncfusion/ej2-angular-dropdowns';
import {
  EditSettingsModel,
  GridComponent,
  SaveEventArgs,
  ToolbarItems,
} from '@syncfusion/ej2-angular-grids';
import {
  Observable,
  Subject,
  combineLatest,
  map,
  shareReplay,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { IGroup } from '@shared/models/group';
import { ProductionService } from '../production.service';
import {
  COMPONENT_KIND_OPTIONS,
  COMPONENT_LABOR,
  COMPONENT_MACHINE,
  COMPONENT_MATERIAL,
  COMPONENT_SUBASSEMBLY,
  IFormulation,
  IFormulationLine,
  IFormulationOverhead,
  IFormulationResidual,
  IProductLine,
  IProductionMerchandise,
  IProductionResource,
} from '../production';

interface IComponentOption {
  id: number;
  name: string;
  code: string;
  uom: string;
  unitCost: number;
}

@Component({
  selector: 'llion-formulation-detail',
  templateUrl: './formulation-detail.html',
  styleUrls: ['../production-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class FormulationDetailComponent implements OnInit, OnDestroy {
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('residualsgrid') residualsGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;
  @ViewChild('residualForm') residualForm?: NgForm;

  headerForm!: FormGroup;
  formulation$!: Observable<IFormulation>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  productLines$!: Observable<IProductLine[]>;
  merchandises$!: Observable<IProductionMerchandise[]>;
  warehouses$!: Observable<IGroup[]>;
  formulations$!: Observable<IFormulation[]>;

  lineFields = { text: 'description', value: 'productLineId' };
  merchandiseFields = { text: 'name', value: 'merchandiseId' };
  warehouseFields = { text: 'description', value: 'groupId' };
  kindFields = { text: 'text', value: 'value' };
  componentFields = { text: 'name', value: 'id' };
  kindOptions = COMPONENT_KIND_OPTIONS;
  filterType: 'Contains' = 'Contains';

  lines: IFormulationLine[] = [];
  overheads: IFormulationOverhead[] = [];
  residuals: IFormulationResidual[] = [];
  lineData!: IFormulationLine;
  residualData!: IFormulationResidual;
  selectedComponentId: number | null = null;
  componentOptions: IComponentOption[] = [];
  currentFormulationId = 0;
  subtotalCost = 0;
  totalCost = 0;
  linesHeight = 220;
  residualsHeight = 180;
  gridEnabled = false;

  private merchandises: IProductionMerchandise[] = [];
  private resources: IProductionResource[] = [];
  private formulations: IFormulation[] = [];
  private readonly destroy$ = new Subject<void>();

  linesToolbar = withToolbarTitle(['Add', 'Edit', 'Delete'], 'Fórmula') as ToolbarItems[];
  residualsToolbar = withToolbarTitle(
    ['Add', 'Edit', 'Delete'],
    'Productos residuales'
  ) as ToolbarItems[];
  linesEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
    allowEditOnDblClick: true,
    showDeleteConfirmDialog: true,
  };
  residualsEditSettings: EditSettingsModel = {
    allowAdding: true,
    allowEditing: true,
    allowDeleting: true,
    mode: 'Dialog',
    allowEditOnDblClick: true,
    showDeleteConfirmDialog: true,
  };

  constructor(
    private formBuilder: FormBuilder,
    private productionService: ProductionService,
    private cdr: ChangeDetectorRef
  ) {
    this.lineData = this.productionService.emptyFormulationLine();
    this.residualData = this.productionService.emptyResidual();
  }

  ngOnInit(): void {
    this.headerForm = this.formBuilder.group({
      formulationCode: [''],
      name: ['', Validators.required],
      description: [''],
      uom: ['PZA'],
      productLineId: [null],
      merchandiseId: [null],
      destinationWarehouseId: [null],
      deactivated: [true],
    });

    this.productLines$ = this.productionService.productLines$;
    this.merchandises$ = this.productionService.merchandises$;
    this.warehouses$ = this.productionService.warehouses$;
    this.formulations$ = this.productionService.formulations$;

    this.enabled$ = this.productionService.enableFormulationForm$.pipe(
      shareReplay(1)
    );

    this.productionService.enableFormulationForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled) => {
        this.gridEnabled = enabled;
        if (enabled) {
          this.headerForm.enable();
        } else {
          this.headerForm.disable();
        }
        this.linesEditSettings = { ...this.linesEditSettings, allowAdding: enabled, allowEditing: enabled, allowDeleting: enabled };
        this.residualsEditSettings = {
          ...this.residualsEditSettings,
          allowAdding: enabled,
          allowEditing: enabled,
          allowDeleting: enabled,
        };
        this.cdr.markForCheck();
      });

    this.visible$ = combineLatest([
      this.productionService.formulationSelected$,
      this.productionService.enableFormulationForm$,
    ]).pipe(
      map(([item, enabled]) => enabled || (item.formulationId ?? 0) > 0),
      shareReplay(1)
    );

    this.formulation$ = this.productionService.formulationSelected$.pipe(
      tap((item) => {
        this.currentFormulationId = item.formulationId ?? 0;
        this.headerForm.patchValue({
          formulationCode: item.formulationCode,
          name: item.name,
          description: item.description,
          uom: item.uom || 'PZA',
          productLineId: item.productLineId || null,
          merchandiseId: item.merchandiseId || null,
          destinationWarehouseId: item.destinationWarehouseId || null,
          deactivated: !item.deactivated,
        });
        this.lines = [...(item.lines ?? [])];
        this.overheads = [...(item.overheads ?? [])];
        this.residuals = [...(item.residuals ?? [])];
        this.recalculate();
        this.cdr.markForCheck();
      })
    );

    this.productionService.merchandises$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.merchandises = rows ?? []));
    this.productionService.resources$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.resources = rows ?? []));
    this.productionService.formulations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.formulations = rows ?? []));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelClick(): void {
    this.productionService.cancelFormulationEdit();
  }

  onSaveClick(): void {
    if (this.headerForm.invalid) {
      this.headerForm.markAllAsTouched();
      return;
    }
    this.recalculate();
    const payload: IFormulation = {
      ...this.productionService.emptyFormulation(),
      formulationId: this.currentFormulationId,
      formulationCode: this.headerForm.value.formulationCode,
      name: this.headerForm.value.name,
      description: this.headerForm.value.description,
      uom: this.headerForm.value.uom || 'PZA',
      productLineId: this.headerForm.value.productLineId || null,
      merchandiseId: this.headerForm.value.merchandiseId || null,
      destinationWarehouseId: this.headerForm.value.destinationWarehouseId || null,
      deactivated: !this.headerForm.value.deactivated,
      subtotalCost: this.subtotalCost,
      totalCost: this.totalCost,
      organizationId: this.productionService.currentOrganizationId,
      lines: this.lines.map((line, index) => ({ ...line, rowNumber: index + 1 })),
      overheads: this.overheads,
      residuals: this.residuals,
    };
    this.productionService.saveFormulation(payload).pipe(take(1)).subscribe();
  }

  onLineActionBegin(args: SaveEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      this.lineData =
        args.requestType === 'add'
          ? {
              ...this.productionService.emptyFormulationLine(),
              rowNumber: this.lines.length + 1,
            }
          : { ...(args.rowData as IFormulationLine) };
      this.selectedComponentId = this.componentIdOf(this.lineData);
      this.refreshComponentOptions();
    }
    if (args.requestType === 'save' && !this.lineForm?.valid) {
      args.cancel = true;
    }
  }

  onLineActionComplete(args: SaveEventArgs): void {
    if (args.requestType === 'save') {
      this.applyLineData();
      const next = [...this.lines];
      const index = next.findIndex((row) => row.rowNumber === this.lineData.rowNumber);
      if (index >= 0) {
        next[index] = { ...this.lineData };
      } else {
        next.push({ ...this.lineData });
      }
      this.lines = next.map((row, i) => ({ ...row, rowNumber: i + 1 }));
      this.recalculate();
      this.cdr.markForCheck();
    }
    if (args.requestType === 'delete') {
      const deleted = (args.data as IFormulationLine[]) ?? [];
      const ids = new Set(deleted.map((row) => row.rowNumber));
      this.lines = this.lines
        .filter((row) => !ids.has(row.rowNumber))
        .map((row, i) => ({ ...row, rowNumber: i + 1 }));
      this.recalculate();
      this.cdr.markForCheck();
    }
  }

  onResidualActionBegin(args: SaveEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      this.residualData =
        args.requestType === 'add'
          ? this.productionService.emptyResidual()
          : { ...(args.rowData as IFormulationResidual) };
    }
    if (args.requestType === 'save' && !this.residualForm?.valid) {
      args.cancel = true;
    }
  }

  onResidualActionComplete(args: SaveEventArgs): void {
    if (args.requestType === 'save') {
      const saved = { ...this.residualData };
      if (args.action === 'add') {
        this.residuals = [...this.residuals, saved];
      } else {
        const index = this.residuals.findIndex(
          (row) => row === (args.rowData as IFormulationResidual)
        );
        const next = [...this.residuals];
        if (index >= 0) {
          next[index] = saved;
        } else {
          next[this.residuals.length - 1] = saved;
        }
        this.residuals = next;
      }
      this.cdr.markForCheck();
    }
    if (args.requestType === 'delete') {
      this.residuals = [...(this.residualsGrid?.getCurrentViewRecords() as IFormulationResidual[] ?? this.residuals)];
      this.cdr.markForCheck();
    }
  }

  onKindChange(): void {
    this.lineData.merchandiseId = null;
    this.lineData.resourceId = null;
    this.lineData.componentFormulationId = null;
    this.selectedComponentId = null;
    this.lineData.uom =
      this.lineData.componentKind === COMPONENT_LABOR ||
      this.lineData.componentKind === COMPONENT_MACHINE
        ? 'HR'
        : 'PZA';
    this.refreshComponentOptions();
  }

  onComponentChange(args: ChangeEventArgs): void {
    const option = this.componentOptions.find((row) => row.id === args.value);
    if (!option) {
      return;
    }
    this.lineData.description = option.name;
    this.lineData.componentCode = option.code;
    this.lineData.uom = option.uom || this.lineData.uom;
    this.lineData.unitCost = option.unitCost || this.lineData.unitCost;
    this.lineData.merchandiseId = null;
    this.lineData.resourceId = null;
    this.lineData.componentFormulationId = null;
    if (this.lineData.componentKind === COMPONENT_MATERIAL) {
      this.lineData.merchandiseId = option.id;
      this.productionService
        .getLastUnitCost(option.id)
        .pipe(take(1))
        .subscribe((cost) => {
          if (cost > 0) {
            this.lineData.unitCost = cost;
            this.onLineAmountChange();
            this.cdr.markForCheck();
          }
        });
    } else if (
      this.lineData.componentKind === COMPONENT_LABOR ||
      this.lineData.componentKind === COMPONENT_MACHINE
    ) {
      this.lineData.resourceId = option.id;
    } else if (this.lineData.componentKind === COMPONENT_SUBASSEMBLY) {
      this.lineData.componentFormulationId = option.id;
      const formulation = this.formulations.find((row) => row.formulationId === option.id);
      this.lineData.merchandiseId = formulation?.merchandiseId ?? null;
    }
    this.onLineAmountChange();
  }

  onLineAmountChange(): void {
    this.lineData.amount =
      (Number(this.lineData.quantity) || 0) * (Number(this.lineData.unitCost) || 0);
  }

  onOverheadRateChange(): void {
    this.recalculate();
  }

  private applyLineData(): void {
    this.onLineAmountChange();
    this.lineData.componentKindName =
      COMPONENT_KIND_OPTIONS.find((row) => row.value === this.lineData.componentKind)?.text ??
      'Material';
  }

  private recalculate(): void {
    this.subtotalCost = this.lines.reduce(
      (sum, line) => sum + (Number(line.amount) || 0),
      0
    );
    this.overheads = this.overheads.map((row) => ({
      ...row,
      amount: this.subtotalCost * (Number(row.rate) || 0),
    }));
    const overheadTotal = this.overheads.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0
    );
    this.totalCost = this.subtotalCost + overheadTotal;
  }

  private componentIdOf(line: IFormulationLine): number | null {
    if (line.componentKind === COMPONENT_MATERIAL) {
      return line.merchandiseId ?? null;
    }
    if (
      line.componentKind === COMPONENT_LABOR ||
      line.componentKind === COMPONENT_MACHINE
    ) {
      return line.resourceId ?? null;
    }
    return line.componentFormulationId ?? null;
  }

  private refreshComponentOptions(): void {
    const kind = this.lineData.componentKind ?? COMPONENT_MATERIAL;
    if (kind === COMPONENT_MATERIAL) {
      this.componentOptions = this.merchandises.map((row) => ({
        id: row.merchandiseId,
        name: row.name,
        code: row.alternCode ?? '',
        uom: 'PZA',
        unitCost: 0,
      }));
    } else if (kind === COMPONENT_LABOR || kind === COMPONENT_MACHINE) {
      const type = kind === COMPONENT_MACHINE ? 2 : 1;
      this.componentOptions = this.resources
        .filter((row) => row.resourceType === type)
        .map((row) => ({
          id: row.resourceId,
          name: row.name,
          code: row.resourceCode,
          uom: row.uom || 'HR',
          unitCost: Number(row.unitCost) || 0,
        }));
    } else if (kind === COMPONENT_SUBASSEMBLY) {
      this.componentOptions = this.formulations
        .filter((row) => row.formulationId !== this.currentFormulationId)
        .map((row) => ({
          id: row.formulationId,
          name: row.name,
          code: row.formulationCode,
          uom: row.uom || 'PZA',
          unitCost: Number(row.totalCost) || 0,
        }));
    }
  }
}
