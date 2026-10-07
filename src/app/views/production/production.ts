export const LINE_KIND_RAW = 0;
export const LINE_KIND_SUBASSEMBLY = 1;
export const LINE_KIND_FINISHED = 2;
export const LINE_KIND_LABOR = 3;
export const LINE_KIND_MACHINE = 4;

export const RESOURCE_TYPE_LABOR = 1;
export const RESOURCE_TYPE_MACHINE = 2;

export const COMPONENT_MATERIAL = 0;
export const COMPONENT_LABOR = 1;
export const COMPONENT_MACHINE = 2;
export const COMPONENT_SUBASSEMBLY = 3;

export const ORDER_STATUS_PENDING = 0;
export const ORDER_STATUS_IN_PROCESS = 1;
export const ORDER_STATUS_PARTIAL = 2;
export const ORDER_STATUS_COMPLETED = 3;
export const ORDER_STATUS_CANCELLED = 4;

export const LINE_KIND_OPTIONS = [
  { text: 'Materia prima', value: LINE_KIND_RAW },
  { text: 'Subensamble', value: LINE_KIND_SUBASSEMBLY },
  { text: 'Producto terminado', value: LINE_KIND_FINISHED },
  { text: 'Mano de obra', value: LINE_KIND_LABOR },
  { text: 'Máquina', value: LINE_KIND_MACHINE },
];

export const RESOURCE_TYPE_OPTIONS = [
  { text: 'Mano de obra', value: RESOURCE_TYPE_LABOR },
  { text: 'Máquina', value: RESOURCE_TYPE_MACHINE },
];

export const COMPONENT_KIND_OPTIONS = [
  { text: 'Material', value: COMPONENT_MATERIAL },
  { text: 'Mano de obra', value: COMPONENT_LABOR },
  { text: 'Máquina', value: COMPONENT_MACHINE },
  { text: 'Subensamble', value: COMPONENT_SUBASSEMBLY },
];

export interface IProductLine {
  productLineId: number;
  lineCode: string;
  description: string;
  lineKind: number;
  lineKindName?: string | null;
  deactivated?: boolean | null;
  organizationId: number;
  createdBy?: string | null;
}

export interface IProductionResource {
  resourceId: number;
  resourceCode: string;
  name: string;
  resourceType: number;
  resourceTypeName?: string | null;
  productLineId?: number | null;
  productLineName?: string | null;
  uom: string;
  unitCost: number;
  availableHours: number;
  deactivated?: boolean | null;
  organizationId: number;
  createdBy?: string | null;
}

export interface IOverheadType {
  overheadTypeId: number;
  overheadCode: string;
  description: string;
  defaultRate: number;
  sortOrder: number;
  deactivated?: boolean | null;
  organizationId: number;
}

export interface IFormulationLine {
  formulationLineId: number;
  formulationId: number;
  rowNumber: number;
  componentKind: number;
  componentKindName?: string | null;
  merchandiseId?: number | null;
  resourceId?: number | null;
  componentFormulationId?: number | null;
  componentCode?: string | null;
  description: string;
  quantity: number;
  uom: string;
  unitCost: number;
  amount: number;
  warehouseId?: number | null;
  warehouseName?: string | null;
  organizationId: number;
}

export interface IFormulationOverhead {
  formulationOverheadId: number;
  formulationId: number;
  overheadTypeId: number;
  overheadCode?: string | null;
  description?: string | null;
  rate: number;
  amount: number;
  organizationId: number;
}

export interface IFormulationResidual {
  formulationResidualId: number;
  formulationId: number;
  merchandiseId?: number | null;
  residualCode?: string | null;
  description: string;
  quantity: number;
  uom: string;
  costPercent: number;
  organizationId: number;
}

export interface IFormulation {
  formulationId: number;
  formulationCode: string;
  name: string;
  description?: string | null;
  merchandiseId?: number | null;
  merchandiseCode?: string | null;
  merchandiseName?: string | null;
  productLineId?: number | null;
  productLineName?: string | null;
  uom: string;
  destinationWarehouseId?: number | null;
  destinationWarehouseName?: string | null;
  subtotalCost: number;
  totalCost: number;
  deactivated?: boolean | null;
  organizationId: number;
  createdBy?: string | null;
  lines: IFormulationLine[];
  overheads: IFormulationOverhead[];
  residuals: IFormulationResidual[];
}

export interface IProductionOrderLine {
  productionOrderLineId: number;
  productionOrderId: number;
  rowNumber: number;
  formulationId: number;
  formulationCode?: string | null;
  formulationName?: string | null;
  merchandiseId?: number | null;
  quantity: number;
  uom: string;
  unitCost: number;
  amount: number;
  issuedQuantity: number;
  pendingQuantity: number;
  deliveredQuantity: number;
  startedOn?: Date | string | null;
  finishedOn?: Date | string | null;
  organizationId: number;
}

export interface IProductionRequirement {
  requirementId: number;
  productionOrderId: number;
  productionOrderLineId?: number | null;
  componentKind: number;
  componentKindName?: string | null;
  merchandiseId?: number | null;
  resourceId?: number | null;
  componentCode?: string | null;
  description: string;
  requiredQuantity: number;
  uom: string;
  onHandQuantity: number;
  pendingQuantity: number;
  reservedQuantity: number;
  consumedQuantity: number;
  theoreticalUnitCost: number;
  organizationId: number;
}

export interface IProductionNote {
  noteId: number;
  productionOrderId: number;
  noteOn?: Date | string | null;
  userName?: string | null;
  comment?: string | null;
  organizationId: number;
  createdBy?: string | null;
}

export interface IProductionOrder {
  productionOrderId: number;
  orderNumber: string;
  description?: string | null;
  issueDate?: Date | string | null;
  estimatedEndDate?: Date | string | null;
  startedOn?: Date | string | null;
  finishedOn?: Date | string | null;
  status: number;
  statusName?: string | null;
  parentProductionOrderId?: number | null;
  salesOrderId?: number | null;
  customerId?: number | null;
  totalCost: number;
  comment?: string | null;
  organizationId: number;
  createdBy?: string | null;
  lines: IProductionOrderLine[];
  requirements: IProductionRequirement[];
  notes: IProductionNote[];
}

export interface IProductionTrackingRow {
  productionOrderLineId: number;
  productionOrderId: number;
  orderNumber: string;
  orderDescription?: string | null;
  formulationId: number;
  formulationCode?: string | null;
  productName: string;
  uom: string;
  quantity: number;
  issuedQuantity: number;
  pendingQuantity: number;
  deliveredQuantity: number;
  startedOn?: Date | string | null;
  finishedOn?: Date | string | null;
  status: number;
  statusName?: string | null;
  organizationId: number;
}

export interface IProductionMerchandise {
  merchandiseId: number;
  name: string;
  alternCode?: string | null;
}

export function isProductionOrderLocked(order: IProductionOrder | null): boolean {
  const status = order?.status ?? 0;
  return status === ORDER_STATUS_COMPLETED || status === ORDER_STATUS_CANCELLED;
}
