export interface IProviderDocumentLine {
  documentId: number;
  rowNumber: number;
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
  acceptanceRate?: number | null;
  reasonNdb?: number | null;
  totalCost?: number | null;
  totalDiscount?: number | null;
  totalCostAndDiscounts?: number | null;
  billRowType?: number | null;
  billRowTypeName?: string | null;
}

export interface IProviderDocumentTax {
  documentId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface IProviderDocumentDiscount {
  documentId: number;
  discountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotal?: number | null;
}

export interface IProviderDocument {
  documentId: number;
  documentNumber: string;
  seriesCode?: string | null;
  providerId?: number | null;
  providerCode?: string | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  issueDateTax?: Date | string | null;
  dueDate?: Date | string | null;
  comment?: string | null;
  warehouseId?: number | null;
  referenceNumber?: string | null;
  taxControlNumber?: string | null;
  billId?: number | null;
  billNumber?: string | null;
  creditCash?: boolean | null;
  creditTerm?: number | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalDiscounts?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  totalDocument?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IProviderDocumentLine[] | null;
  taxes?: IProviderDocumentTax[] | null;
  discounts?: IProviderDocumentDiscount[] | null;
}
