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
  EditSettingsModel,
  ToolbarItems,
  TreeGridComponent,
} from '@syncfusion/ej2-angular-treegrid';
import { fromEvent, Observable, Subject, take, takeUntil } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  IOrganizationParameter,
  IParameterType,
} from '../organization';
import { OrganizationService } from '../organization.service';
import { ToastService } from '@shared/services/toastService';
import { toastType } from '@shared/enums/enums';
import { withToolbarTitle } from '@shared/utils/grid-toolbar';
import { applyGridHeightAboveFooter } from '@shared/utils/layout';

type ValueEditorKind = 'bit' | 'int' | 'decimal' | 'date' | 'text';

type ParameterTreeRow = Omit<IOrganizationParameter, 'level'> & {
  parameterLevel: number;
  treeId: number;
  subtasks?: ParameterTreeRow[];
};

@Component({
  selector: 'llion-organization-parameters',
  templateUrl: './organization-parameters.html',
  styleUrls: ['./organization-parameters.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class OrganizationParametersComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('parametersgrid') parametersGrid?: TreeGridComponent;
  @ViewChild('parameterForm') parameterForm?: NgForm;

  parameterRows: ParameterTreeRow[] = [];
  parameterTypes$!: Observable<IParameterType[]>;

  parametersGridHeight = 320;
  readonly parametersGridRowHeight = 36;
  parametersGridEnabled = false;
  readonly editableLevel = 2;

  parameterTypeFields: Object = {
    text: 'description',
    value: 'parameterType',
  };
  yesNoFields: Object = { text: 'text', value: 'value' };
  yesNoOptions = [
    { text: 'No', value: '0' },
    { text: 'Sí', value: '1' },
  ];
  weekdayOptions = [
    { text: '1 — Lunes', value: '1' },
    { text: '2 — Martes', value: '2' },
    { text: '3 — Miércoles', value: '3' },
    { text: '4 — Jueves', value: '4' },
    { text: '5 — Viernes', value: '5' },
    { text: '6 — Sábado', value: '6' },
    { text: '7 — Domingo', value: '7' },
  ];

  parameterData: IOrganizationParameter = this.createEmptyParameter();
  selectedType?: IParameterType;
  valueEditorKind: ValueEditorKind = 'text';
  numericValue: number | null = null;
  dateValue: Date | null = null;
  decimalPlaces = 2;
  valueHint = '';

  parametersToolbar = withToolbarTitle([], 'Parámetros') as ToolbarItems[];

  parametersEditSettings: EditSettingsModel = {
    allowAdding: false,
    allowEditing: false,
    allowDeleting: false,
    mode: 'Dialog',
    allowEditOnDblClick: true,
    showDeleteConfirmDialog: false,
  };

  private selectedOrganizationId = 0;
  private parameterTypes: IParameterType[] = [];
  private collapseOnBind = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private organizationService: OrganizationService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.organizationService.organizationParameters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((rows) => {
        this.collapseOnBind = true;
        this.parameterRows = this.buildTreeRows(rows ?? []);
        this.applyTreeData();
        this.cdr.markForCheck();
      });

    this.parameterTypes$ = this.organizationService.parameterTypes$;
    this.parameterTypes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((types) => {
        this.parameterTypes = types ?? [];
        this.cdr.markForCheck();
      });

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
    this.applyTreeData();
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

  isEditableParameter(row?: IOrganizationParameter | null): boolean {
    return this.getParameterLevel(row) === this.editableLevel && !!row?.parameterId;
  }

  rowDataBound(args: { data?: IOrganizationParameter; row?: Element }): void {
    if (!args.row || !args.data) {
      return;
    }
    const row = args.row as HTMLElement;
    const level = this.getParameterLevel(args.data);
    const hasChildren = this.hasChildNodes(args.data);
    row.classList.toggle('parameter-folder-row', level < this.editableLevel || hasChildren);
    row.classList.toggle(
      'parameter-editable-row',
      level === this.editableLevel && !hasChildren
    );
  }

  valueAccessor = (_field: string, data: IOrganizationParameter): string =>
    this.formatParameterValue(this.getSourceParameter(data));

  queryCellInfo(args: {
    column?: { field?: string };
    data?: IOrganizationParameter;
    cell?: HTMLElement;
  }): void {
    if (args.column?.field !== 'value' || !args.cell) {
      return;
    }
    const row = this.getSourceParameter(args.data);
    if (this.isNumericParameter(row)) {
      args.cell.classList.add('parameter-value-numeric');
    }
  }

  onDataBound(): void {
    const grid = this.parametersGrid;
    if (this.collapseOnBind && grid && (grid.getCurrentViewRecords()?.length ?? 0) > 0) {
      this.collapseOnBind = false;
      grid.collapseAll();
    }
    this.applyOrganizationEditState(this.selectedOrganizationId > 0);
    this.updateGridHeight();
  }

  onToolbarClick(args: { item?: { id?: string }; cancel?: boolean }): void {
    const id = (args.item?.id ?? '').toLowerCase();
    if (!id.includes('_edit')) {
      return;
    }

    const selected = this.getSelectedParameter();
    if (!this.isEditableParameter(selected)) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Solo se puede modificar el valor de un parámetro (nivel 2)',
        toastType.warning
      );
    }
  }

  actionBegin(args: {
    requestType?: string;
    cancel?: boolean;
    data?: unknown;
    rowData?: unknown;
  }): void {
    const needsOrganization =
      args.requestType === 'beginEdit' ||
      args.requestType === 'save';

    if (needsOrganization && !this.parametersGridEnabled) {
      args.cancel = true;
      this.toastService.showMyToast(
        'Debe seleccionar una organización para gestionar parámetros',
        toastType.warning
      );
      return;
    }

    if (args.requestType === 'add' || args.requestType === 'delete') {
      args.cancel = true;
      return;
    }

    const row = this.getSourceParameter(args.rowData ?? args.data);

    if (args.requestType === 'beginEdit') {
      if (!this.isEditableParameter(row)) {
        args.cancel = true;
        return;
      }
      this.parameterData = {
        ...this.createEmptyParameter(),
        ...this.toParameterPayload(row as IOrganizationParameter),
      };
      this.prepareValueEditor(this.parameterData);
      this.cdr.markForCheck();
      return;
    }

    if (args.requestType === 'save') {
      this.syncValueFromEditor();
      const payload = this.toParameterPayload(this.parameterData);
      const error = this.validateValue(
        payload.value,
        payload.parameterType
      );
      if (error) {
        args.cancel = true;
        this.toastService.showMyToast(error, toastType.warning);
        return;
      }
      args.data = payload;
      this.organizationService
        .updateParameter(payload)
        .pipe(take(1))
        .subscribe({
          error: () => {
            args.cancel = true;
          },
        });
    }
  }

  actionComplete(args: {
    requestType?: string;
    dialog?: { header?: string };
  }): void {
    if (args.requestType === 'beginEdit') {
      const dialog = args.dialog;
      if (dialog) {
        dialog.header = 'Editar valor';
      }
    }
  }

  private applyOrganizationEditState(enabled: boolean): void {
    this.parametersGridEnabled = enabled;
    this.parametersToolbar = withToolbarTitle(
      enabled ? ['Edit'] : [],
      'Parámetros'
    ) as ToolbarItems[];
    this.parametersEditSettings = {
      allowAdding: false,
      allowEditing: enabled,
      allowDeleting: false,
      mode: 'Dialog',
      allowEditOnDblClick: enabled,
      showDeleteConfirmDialog: false,
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

  private updateGridHeight(): void {
    this.parametersGridHeight = applyGridHeightAboveFooter(
      this.parametersGrid,
      280
    );
    this.cdr.markForCheck();
  }

  private prepareValueEditor(row: IOrganizationParameter): void {
    this.selectedType = this.parameterTypes.find(
      (item) => item.parameterType === String(row.parameterType)
    );
    const typeId = String(row.parameterType ?? '');
    this.valueEditorKind = this.editorKindFor(typeId);
    this.decimalPlaces = this.decimalPlacesFor(typeId, this.selectedType);
    this.valueHint = this.hintFor(typeId, this.selectedType);
    this.numericValue = null;
    this.dateValue = null;

    const raw = String(row.value ?? '').trim();
    if (this.valueEditorKind === 'decimal' || this.valueEditorKind === 'int') {
      const parsed = Number(raw.replace(',', '.'));
      this.numericValue = Number.isFinite(parsed) ? parsed : null;
    } else if (this.valueEditorKind === 'date') {
      this.dateValue = this.parseDate(raw);
    }
  }

  private syncValueFromEditor(): void {
    if (this.valueEditorKind === 'decimal') {
      this.parameterData.value =
        this.numericValue === null || this.numericValue === undefined
          ? ''
          : this.numericValue.toFixed(this.decimalPlaces);
      return;
    }
    if (this.valueEditorKind === 'int') {
      this.parameterData.value =
        this.numericValue === null || this.numericValue === undefined
          ? ''
          : String(Math.trunc(this.numericValue));
      return;
    }
    if (this.valueEditorKind === 'date') {
      this.parameterData.value = this.formatDate(this.dateValue);
    }
  }

  private editorKindFor(typeId: string): ValueEditorKind {
    switch (typeId) {
      case '0':
        return 'bit';
      case '3':
      case '4':
      case '7':
      case '8':
      case '9':
      case '10':
        return 'int';
      case '1':
      case '5':
      case '13':
      case '14':
        return 'decimal';
      case '6':
        return 'date';
      default:
        return 'text';
    }
  }

  private decimalPlacesFor(typeId: string, type?: IParameterType): number {
    const fromType = this.decimalPlacesFromType(type);
    if (fromType !== null) {
      return fromType;
    }
    switch (typeId) {
      case '1':
        return 4;
      case '5':
        return 3;
      default:
        return 2;
    }
  }

  private hintFor(typeId: string, type?: IParameterType): string {
    const format = type?.format || '';
    switch (typeId) {
      case '0':
        return 'Formato: 0 = No, 1 = Sí';
      case '1':
        return 'Formato: porcentaje Decimal(6,4)';
      case '2':
        return 'Formato: texto, máximo 255 caracteres';
      case '3':
        return 'Formato: día de la semana, entero 1 a 7';
      case '4':
      case '7':
      case '8':
      case '9':
      case '10':
        return format ? `Formato: ${format}` : 'Formato: entero';
      case '5':
        return 'Formato: cantidad/peso Decimal(10,3)';
      case '6':
        return 'Formato: fecha dd/MM/yyyy';
      case '11':
        return 'Formato: Desde, Hasta, Porcentaje';
      case '12':
        return 'Formato: tabla / texto';
      case '13':
        return 'Formato: moneda';
      case '14':
        return 'Formato: Decimal(19,2)';
      default:
        return format ? `Formato: ${format}` : '';
    }
  }

  private validateValue(value: string, typeId: string): string | null {
    const raw = (value ?? '').trim();
    if (!raw) {
      return 'El valor es obligatorio';
    }

    switch (String(typeId)) {
      case '0':
        return /^[01]$/.test(raw)
          ? null
          : 'El tipo No/Sí admite solo 0 o 1';
      case '1':
        return this.validateDecimal(raw, 6, 4, 'porcentaje');
      case '2':
        return raw.length <= 255
          ? null
          : 'El texto no puede superar 255 caracteres';
      case '3': {
        const day = Number(raw);
        return Number.isInteger(day) && day >= 1 && day <= 7
          ? null
          : 'El día de la semana debe ser un entero de 1 a 7';
      }
      case '4':
      case '7':
      case '8':
      case '9':
      case '10':
        return /^-?\d+$/.test(raw) ? null : 'Debe ser un entero';
      case '5':
        return this.validateDecimal(raw, 10, 3, 'cantidad/peso');
      case '6':
        return this.parseDate(raw)
          ? null
          : 'La fecha debe tener formato dd/MM/yyyy';
      case '11': {
        const parts = raw.split(/[;,]/).map((part) => part.trim());
        if (parts.length !== 3 || parts.some((part) => part === '')) {
          return 'El vector debe ser: Desde, Hasta, Porcentaje';
        }
        const invalid = parts.find((part) => !Number.isFinite(Number(part.replace(',', '.'))));
        return invalid
          ? 'Desde, Hasta y Porcentaje deben ser numéricos'
          : null;
      }
      case '12':
        return raw.length <= 255
          ? null
          : 'El valor no puede superar 255 caracteres';
      case '13':
        return this.validateDecimal(raw, 19, 2, 'moneda');
      case '14':
        return this.validateDecimal(raw, 19, 2, 'decimal');
      default:
        return raw.length <= 255
          ? null
          : 'El valor no puede superar 255 caracteres';
    }
  }

  private validateDecimal(
    raw: string,
    precision: number,
    scale: number,
    label: string
  ): string | null {
    const normalized = raw.replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
      return `El ${label} debe ser numérico`;
    }
    const [whole, fraction = ''] = normalized.replace('-', '').split('.');
    if (fraction.length > scale) {
      return `El ${label} admite hasta ${scale} decimales`;
    }
    if (whole.length + Math.min(fraction.length, scale) > precision) {
      return `El ${label} no coincide con Decimal(${precision},${scale})`;
    }
    return null;
  }

  private parseDate(raw: string): Date | null {
    const value = (raw ?? '').trim();
    if (!value) {
      return null;
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) {
      const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (dmy) {
      const date = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private formatDate(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  private formatParameterValue(row?: IOrganizationParameter | null): string {
    const raw = String(row?.value ?? '').trim();
    if (!raw || !row) {
      return raw;
    }

    const typeId = String(row.parameterType ?? '');
    const catalog = this.parameterTypes.find(
      (item) => item.parameterType === typeId
    );
    const typeName = String(row.typeName || catalog?.typeName || '').toUpperCase();
    const format = String(row.format || catalog?.format || '').trim();
    const labels = this.parseFormatLabels(format);

    if (labels[raw]) {
      return labels[raw];
    }
    if (typeId === '0' || typeName === 'BIT') {
      return /^(1|true|s[ií])$/i.test(raw) ? 'Sí' : 'No';
    }
    if (this.isDateFormat(format, typeName, typeId)) {
      const date = this.parseDate(raw);
      return date ? this.formatDate(date) : raw;
    }

    const decimals = this.decimalPlacesFromMask(format, typeName);
    if (decimals !== null) {
      return this.formatNumber(raw, decimals);
    }
    if (typeName === 'CURRENCY') {
      return this.formatNumber(raw, 2);
    }
    if (typeName === 'INT') {
      return this.formatNumber(raw, 0);
    }
    return raw;
  }

  private parseFormatLabels(format: string): Record<string, string> {
    const labels: Record<string, string> = {};
    if (!format) {
      return labels;
    }
    const matches = format.matchAll(/(\d+)\s*=\s*([^;,)]+)/g);
    for (const match of matches) {
      labels[match[1]] = match[2].trim();
    }
    return labels;
  }

  private isDateFormat(format: string, typeName: string, typeId: string): boolean {
    return (
      typeId === '6' ||
      typeName === 'DATE' ||
      /d{1,2}\/m{1,2}\/y{2,4}/i.test(format)
    );
  }

  private isNumericParameter(row?: IOrganizationParameter | null): boolean {
    const typeId = String(row?.parameterType ?? '');
    const catalog = this.parameterTypes.find(
      (item) => item.parameterType === typeId
    );
    const typeName = String(row?.typeName || catalog?.typeName || '').toUpperCase();
    const format = String(row?.format || catalog?.format || '');
    return (
      typeName === 'INT' ||
      typeName === 'CURRENCY' ||
      typeName.startsWith('DECIMAL') ||
      /^9+(\.9+)?$/.test(format) ||
      typeId === '1' ||
      typeId === '4' ||
      typeId === '5' ||
      typeId === '7' ||
      typeId === '8' ||
      typeId === '9' ||
      typeId === '10' ||
      typeId === '13' ||
      typeId === '14'
    );
  }

  private decimalPlacesFromType(type?: IParameterType): number | null {
    return this.decimalPlacesFromMask(type?.format, type?.typeName);
  }

  private decimalPlacesFromMask(
    format?: string | null,
    typeName?: string | null
  ): number | null {
    const mask = String(format ?? '').trim();
    if (/^9+$/.test(mask)) {
      return 0;
    }
    const nines = /^9+\.(9+)$/.exec(mask);
    if (nines) {
      return nines[1].length;
    }
    const decimalType = /decimal\s*\(\s*\d+\s*,\s*(\d+)\s*\)/i.exec(
      String(typeName ?? '')
    );
    if (decimalType) {
      return Number(decimalType[1]);
    }
    if (String(typeName ?? '').toUpperCase() === 'CURRENCY') {
      return 2;
    }
    return null;
  }

  private formatNumber(raw: string, decimals: number): string {
    const parsed = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(parsed)) {
      return raw;
    }
    return new Intl.NumberFormat('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(parsed);
  }

  private getSelectedParameter(): IOrganizationParameter | undefined {
    const records = this.parametersGrid?.getSelectedRecords() as
      | IOrganizationParameter[]
      | undefined;
    return this.getSourceParameter(records?.[0]);
  }

  private hasChildNodes(data?: IOrganizationParameter | null): boolean {
    const record = data as (IOrganizationParameter & {
      hasChildRecords?: boolean;
      childRecords?: unknown[];
      taskData?: IOrganizationParameter;
    }) | null | undefined;
    if (!record) {
      return false;
    }
    if (record.hasChildRecords === true) {
      return true;
    }
    if (record.hasChildRecords === false) {
      return false;
    }
    if (Array.isArray(record.childRecords) && record.childRecords.length > 0) {
      return true;
    }
    const source = this.getSourceParameter(record) as ParameterTreeRow | undefined;
    return Array.isArray(source?.subtasks) && source.subtasks.length > 0;
  }

  private getParameterLevel(data?: IOrganizationParameter | null): number {
    const original = this.getSourceParameter(data);
    return Number(original?.parameterLevel ?? original?.level ?? 0);
  }

  private applyTreeData(): void {
    const grid = this.parametersGrid;
    if (!grid) {
      return;
    }
    grid.dataSource = this.parameterRows;
  }

  private buildTreeRows(rows: IOrganizationParameter[]): ParameterTreeRow[] {
    const items: ParameterTreeRow[] = rows.map((row, index) => ({
      parameterId: row.parameterId,
      parameterCode: row.parameterCode,
      description: row.description,
      parameterType: row.parameterType,
      typeName: row.typeName,
      format: row.format,
      value: row.value,
      module: row.module,
      parentId: row.parentId,
      organizationId: row.organizationId,
      parameterLevel: this.inferParameterLevel(row),
      treeId: index + 1,
    }));

    const roots: ParameterTreeRow[] = [];
    let lastRoot: ParameterTreeRow | null = null;
    let lastChild: ParameterTreeRow | null = null;

    for (const item of items) {
      const level = Number(item.parameterLevel ?? 0);
      if (level <= 0) {
        roots.push(item);
        lastRoot = item;
        lastChild = null;
        continue;
      }
      if (level === 1) {
        this.appendChild(lastRoot, item, roots);
        lastChild = item;
        continue;
      }
      this.appendChild(lastChild ?? lastRoot, item, roots);
    }

    return roots.length > 0 ? roots : items;
  }

  private appendChild(
    parent: ParameterTreeRow | null,
    child: ParameterTreeRow,
    roots: ParameterTreeRow[]
  ): void {
    if (!parent) {
      roots.push(child);
      return;
    }
    parent.subtasks = parent.subtasks ?? [];
    parent.subtasks.push(child);
  }

  private inferParameterLevel(row: IOrganizationParameter): number {
    const numbered = /^\s*(\d+)\.(\d+)/.exec(String(row.description ?? ''));
    if (numbered) {
      return Number(numbered[2]) === 0 ? 1 : 2;
    }
    const declared = Number(row.level ?? 0);
    return declared > 0 ? declared : 0;
  }

  private getSourceParameter(
    data: unknown
  ): IOrganizationParameter | undefined {
    if (!data) {
      return undefined;
    }
    const row = (Array.isArray(data) ? data[0] : data) as IOrganizationParameter & {
      taskData?: IOrganizationParameter;
    };
    return (row.taskData ?? row) as IOrganizationParameter | undefined;
  }

  private toParameterPayload(
    row: Partial<IOrganizationParameter>
  ): IOrganizationParameter {
    const parentRaw = row.parentId;
    const parentId =
      parentRaw === null || parentRaw === undefined || Number(parentRaw) === 0
        ? null
        : Number(parentRaw);
    return {
      parameterId: Number(row.parameterId ?? 0),
      parameterCode: String(row.parameterCode ?? '').trim(),
      description: String(row.description ?? '').trim(),
      parameterType: String(row.parameterType ?? '').trim(),
      value: String(row.value ?? '').trim(),
      module: String(row.module ?? '').trim(),
      parentId,
      level: Number(row.parameterLevel ?? row.level ?? 0),
      organizationId: this.selectedOrganizationId,
    };
  }

  private createEmptyParameter(): IOrganizationParameter {
    return {
      parameterId: 0,
      parameterCode: '',
      description: '',
      parameterType: '',
      value: '',
      module: '',
      parentId: null,
      level: 0,
      organizationId: this.selectedOrganizationId,
    };
  }
}
