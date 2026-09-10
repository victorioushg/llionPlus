export interface IDebitNoteLine {
  dbnId: number;
  dbnRowNumber: number;
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
  reasonNdb?: number | null;
  totalCost?: number | null;
  totalDiscount?: number | null;
  totalCostAndDiscounts?: number | null;
  billRowType?: number | null;
  billRowTypeName?: string | null;
}

export interface IDebitNoteMerchandise {
  merchandiseId: number;
  name: string;
  description?: string | null;
  alternCode?: string | null;
  ivaRateType?: string | null;
  unidadServicio?: string | null;
}

export interface IDebitNoteUnit {
  code: string;
  weight: number;
  wholesale: boolean;
}

export interface IDebitNoteTax {
  dbnId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface IDebitNoteDiscount {
  dbnId: number;
  dbnDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalDBN?: number | null;
}

export interface IDebitNote {
  dbnId: number;
  dbnNumber: string;
  dbnSeriesCode?: string | null;
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
  totalDBN?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IDebitNoteLine[] | null;
  taxes?: IDebitNoteTax[] | null;
  discounts?: IDebitNoteDiscount[] | null;
}
