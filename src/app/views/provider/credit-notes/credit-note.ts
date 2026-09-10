export interface ICreditNoteLine {
  crnId: number;
  crnRowNumber: number;
  merchandiseId?: number | null;
  itemCode?: string | null;
  description?: string | null;
  taxCode?: string | null;
  quantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  costByUnit?: number | null;
  merchandiseDiscount?: number | null;
  vendorDiscount?: number | null;
  acceptanceRate?: number | null;
  totalCost?: number | null;
  totalDiscount?: number | null;
  totalCostAndDiscounts?: number | null;
  billRowType?: number | null;
  billRowTypeName?: string | null;
}

export interface ICreditNoteMerchandise {
  merchandiseId: number;
  name: string;
  description?: string | null;
  alternCode?: string | null;
  ivaRateType?: string | null;
  unidadServicio?: string | null;
}

export interface ICreditNoteUnit {
  code: string;
  weight: number;
  wholesale: boolean;
}

export interface ICreditNoteTax {
  crnId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface ICreditNoteDiscount {
  crnId: number;
  crnDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalCRN?: number | null;
}

export interface ICreditNote {
  crnId: number;
  crnNumber: string;
  crnSeriesCode?: string | null;
  billId?: number | null;
  billNumber?: string | null;
  providerId?: number | null;
  providerCode?: string | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  issueDateTax?: Date | string | null;
  dueDate?: Date | string | null;
  warehouseId?: number | null;
  referenceNumber?: string | null;
  accountId?: number | null;
  classId?: number | null;
  creditCash?: number | null;
  creditTerm?: number | null;
  journalEntryDate?: Date | string | null;
  comment?: string | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalDiscounts?: number | null;
  totalCRN?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: ICreditNoteLine[] | null;
  taxes?: ICreditNoteTax[] | null;
  discounts?: ICreditNoteDiscount[] | null;
}
