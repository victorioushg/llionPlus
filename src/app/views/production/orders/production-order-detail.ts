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
import { ProductionService } from '../production.service';
import {
  IFormulation,
  IProductionOrder,
  IProductionOrderLine,
  IProductionRequirement,
} from '../production';

@Component({
  selector: 'llion-production-order-detail',
  templateUrl: './production-order-detail.html',
  styleUrls: ['../production-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ProductionOrderDetailComponent implements OnInit, OnDestroy {
  @ViewChild('linesgrid') linesGrid?: GridComponent;
  @ViewChild('lineForm') lineForm?: NgForm;

  headerForm!: FormGroup;
  order$!: Observable<IProductionOrder>;
  enabled$!: Observable<boolean>;
  visible$!: Observable<boolean>;
  formulations$!: Observable<IFormulation[]>;
  formulationFields = { text: 'name', value: 'formulationId' };
  filterType: 'Contains' = 'Contains';

  lines: IProductionOrderLine[] = [];
  requirements: IProductionRequirement[] = [];
  notes: IProductionOrder['notes'] = [];
  lineData!: IProductionOrderLine;
  currentOrderId = 0;
  currentStatus = 0;
  totalCost = 0;
  linesHeight = 180;
  explosionHeight = 200;
  notesHeight = 160;
  noteComment = '';
  gridEnabled = false;
  headerText = [
    { text: 'productos' },
    { text: 'explosión' },
    { text: 'notas' },
  ];

  private formulations: IFormulation[] = [];
  private readonly destroy$ = new Subject<void>();

  linesToolbar = withToolbarTitle(['Add', 'Edit', 'Delete'], 'Productos') as ToolbarItems[];
  linesEditSettings: EditSettingsModel = {
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
    this.lineData = this.productionService.emptyOrderLine();
  }

  ngOnInit(): void {
    this.headerForm = this.formBuilder.group({
      orderNumber: [{ value: '', disabled: true }],
      description: [''],
      issueDate: [null, Validators.required],
      estimatedEndDate: [null],
      statusName: [{ value: '', disabled: true }],
    });

    this.formulations$ = this.productionService.formulations$;
    this.productionService.formulations$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => (this.formulations = rows ?? []));

    this.enabled$ = this.productionService.enableOrderForm$.pipe(shareReplay(1));
    this.productionService.enableOrderForm$
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled) => {
        this.gridEnabled = enabled;
        if (enabled) {
          this.headerForm.enable();
          this.headerForm.get('orderNumber')?.disable();
          this.headerForm.get('statusName')?.disable();
        } else {
          this.headerForm.disable();
        }
        this.linesEditSettings = {
          ...this.linesEditSettings,
          allowAdding: enabled,
          allowEditing: enabled,
          allowDeleting: enabled,
        };
        this.cdr.markForCheck();
      });

    this.visible$ = combineLatest([
      this.productionService.productionOrderSelected$,
      this.productionService.enableOrderForm$,
    ]).pipe(
      map(([item, enabled]) => enabled || (item.productionOrderId ?? 0) > 0),
      shareReplay(1)
    );

    this.order$ = this.productionService.productionOrderSelected$.pipe(
      tap((item) => {
        this.currentOrderId = item.productionOrderId ?? 0;
        this.currentStatus = item.status ?? 0;
        this.headerForm.patchValue({
          orderNumber: item.orderNumber,
          description: item.description,
          issueDate: item.issueDate ? new Date(item.issueDate) : null,
          estimatedEndDate: item.estimatedEndDate
            ? new Date(item.estimatedEndDate)
            : null,
          statusName: item.statusName,
        });
        this.lines = [...(item.lines ?? [])];
        this.requirements = [...(item.requirements ?? [])];
        this.notes = [...(item.notes ?? [])];
        this.totalCost = Number(item.totalCost) || this.sumAmount();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCancelClick(): void {
    this.productionService.cancelOrderEdit();
  }

  onSaveClick(): void {
    if (this.headerForm.invalid) {
      this.headerForm.markAllAsTouched();
      return;
    }
    const payload: IProductionOrder = {
      ...this.productionService.emptyProductionOrder(),
      productionOrderId: this.currentOrderId,
      orderNumber: this.headerForm.getRawValue().orderNumber,
      description: this.headerForm.value.description,
      issueDate: this.headerForm.value.issueDate,
      estimatedEndDate: this.headerForm.value.estimatedEndDate,
      status: this.currentStatus,
      organizationId: this.productionService.currentOrganizationId,
      lines: this.lines.map((line, index) => ({ ...line, rowNumber: index + 1 })),
      requirements: [],
      notes: [],
    };
    this.productionService.saveProductionOrder(payload).pipe(take(1)).subscribe();
  }

  onLineActionBegin(args: SaveEventArgs): void {
    if (args.requestType === 'beginEdit' || args.requestType === 'add') {
      this.lineData =
        args.requestType === 'add'
          ? {
              ...this.productionService.emptyOrderLine(),
              rowNumber: this.lines.length + 1,
            }
          : { ...(args.rowData as IProductionOrderLine) };
    }
    if (args.requestType === 'save' && !this.lineForm?.valid) {
      args.cancel = true;
    }
  }

  onLineActionComplete(args: SaveEventArgs): void {
    if (args.requestType === 'save') {
      this.onLineAmountChange();
      const next = [...this.lines];
      const index = next.findIndex((row) => row.rowNumber === this.lineData.rowNumber);
      if (index >= 0) {
        next[index] = { ...this.lineData };
      } else {
        next.push({ ...this.lineData });
      }
      this.lines = next.map((row, i) => ({ ...row, rowNumber: i + 1 }));
      this.totalCost = this.sumAmount();
      this.cdr.markForCheck();
    }
    if (args.requestType === 'delete') {
      const deleted = (args.data as IProductionOrderLine[]) ?? [];
      const ids = new Set(deleted.map((row) => row.rowNumber));
      this.lines = this.lines
        .filter((row) => !ids.has(row.rowNumber))
        .map((row, i) => ({ ...row, rowNumber: i + 1 }));
      this.totalCost = this.sumAmount();
      this.cdr.markForCheck();
    }
  }

  onFormulationChange(args: ChangeEventArgs): void {
    const formulation = this.formulations.find(
      (row) => row.formulationId === args.value
    );
    if (!formulation) {
      return;
    }
    this.lineData.formulationCode = formulation.formulationCode;
    this.lineData.formulationName = formulation.name;
    this.lineData.merchandiseId = formulation.merchandiseId ?? null;
    this.lineData.uom = formulation.uom || 'PZA';
    this.lineData.unitCost = Number(formulation.totalCost) || 0;
    this.onLineAmountChange();
  }

  onLineAmountChange(): void {
    this.lineData.amount =
      (Number(this.lineData.quantity) || 0) * (Number(this.lineData.unitCost) || 0);
    this.lineData.pendingQuantity = Number(this.lineData.quantity) || 0;
  }

  addNote(): void {
    const comment = (this.noteComment ?? '').trim();
    if (!comment || this.currentOrderId <= 0) {
      return;
    }
    this.productionService
      .addNote(this.currentOrderId, comment)
      .pipe(take(1))
      .subscribe((id) => {
        if (id > 0) {
          this.noteComment = '';
          this.cdr.markForCheck();
        }
      });
  }

  private sumAmount(): number {
    return this.lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  }
}
