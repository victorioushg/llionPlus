export interface IGoodsReceiptLine {
  grId: number;
  grRowNumber: number;
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

export interface IGoodsReceiptMerchandise {
  merchandiseId: number;
  name: string;
  description?: string | null;
  alternCode?: string | null;
  ivaRateType?: string | null;
  unidadServicio?: string | null;
}

export interface IGoodsReceiptUnit {
  code: string;
  weight: number;
  wholesale: boolean;
}

export interface IGoodsReceiptTax {
  grId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface IGoodsReceiptDiscount {
  grId: number;
  grDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalGR?: number | null;
}

export interface IGoodsReceipt {
  grId: number;
  grNumber: string;
  grSeriesCode?: string | null;
  providerId?: number | null;
  providerCode?: string | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  issueDateTax?: Date | string | null;
  warehouseId?: number | null;
  referenceNumber?: string | null;
  comment?: string | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalDiscounts?: number | null;
  totalGoodsReceipt?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IGoodsReceiptLine[] | null;
  taxes?: IGoodsReceiptTax[] | null;
  discounts?: IGoodsReceiptDiscount[] | null;
}
