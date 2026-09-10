export interface IPurchaseOrderLine {
  poId: number;
  poRowNumber: number;
  merchandiseId?: number | null;
  itemCode?: string | null;
  description?: string | null;
  taxCode?: string | null;
  quantity?: number | null;
  transitQuantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  costByUnit?: number | null;
  merchandiseDiscount?: number | null;
  vendorDiscount?: number | null;
  totalCost?: number | null;
  totalDiscount?: number | null;
  totalCostAndDiscounts?: number | null;
  billRowType?: number | null;
  billRowTypeName?: string | null;
}

export interface IPurchaseOrderMerchandise {
  merchandiseId: number;
  name: string;
  description?: string | null;
  alternCode?: string | null;
  ivaRateType?: string | null;
  unidadServicio?: string | null;
}

export interface IPurchaseOrderUnit {
  code: string;
  weight: number;
  wholesale: boolean;
}

export interface IPurchaseOrderTax {
  poId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface IPurchaseOrderDiscount {
  poId: number;
  poDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalPO?: number | null;
}

export interface IPurchaseOrder {
  poId: number;
  poNumber: string;
  poSeriesCode?: string | null;
  providerId?: number | null;
  providerCode?: string | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  comment?: string | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalPurchaseOrder?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IPurchaseOrderLine[] | null;
  taxes?: IPurchaseOrderTax[] | null;
  discounts?: IPurchaseOrderDiscount[] | null;
}

export function isPurchaseOrderProcessed(
  order: IPurchaseOrder | null | undefined
): boolean {
  const name = (order?.statusName ?? '').trim().toLowerCase();
  if (name === 'procesada') {
    return true;
  }
  return Number(order?.status) === 2;
}

export function isPurchaseOrderReadOnly(
  order: IPurchaseOrder | null | undefined
): boolean {
  if (!order) {
    return false;
  }
  if (order.lockedDate) {
    return true;
  }
  const name = (order.statusName ?? '').trim().toLowerCase();
  if (name === 'cerrada') {
    return true;
  }
  return isPurchaseOrderProcessed(order);
}
