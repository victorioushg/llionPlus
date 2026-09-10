export interface IPurchaseLine {
  billId: number;
  billRowNumber: number;
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
  totalCost?: number | null;
  totalDiscount?: number | null;
  totalCostAndDiscounts?: number | null;
  billRowType?: number | null;
  billRowTypeName?: string | null;
}

export interface IPurchaseMerchandise {
  merchandiseId: number;
  name: string;
  description?: string | null;
  alternCode?: string | null;
  ivaRateType?: string | null;
  unidadServicio?: string | null;
}

export interface IPurchaseUnit {
  code: string;
  weight: number;
  wholesale: boolean;
}

export interface IPurchaseTax {
  billId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
  taxWithHolding?: string | null;
  withHoldingTaxAmount?: number | null;
  withHoldingTaxRate?: number | null;
}

export interface IPurchaseDiscount {
  billId: number;
  billDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalBill?: number | null;
}

export interface IPurchase {
  billId: number;
  billNumber: string;
  billSeriesCode?: string | null;
  providerId?: number | null;
  providerCode?: string | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  issueDateTax?: Date | string | null;
  dueDate?: Date | string | null;
  warehouseId?: number | null;
  referenceNumber?: string | null;
  taxControlNumber?: string | null;
  accountId?: number | null;
  classId?: number | null;
  creditCash?: number | null;
  creditTerm?: number | null;
  journalEntryDate?: Date | string | null;
  comment?: string | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalDiscounts?: number | null;
  totalBill?: number | null;
  totalWeight?: number | null;
  totalTaxes?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IPurchaseLine[] | null;
  taxes?: IPurchaseTax[] | null;
  discounts?: IPurchaseDiscount[] | null;
}

export interface IInvoiceExtractedFields {
  vendorRif?: string | null;
  vendorName?: string | null;
  billNumber?: string | null;
  billSeriesCode?: string | null;
  taxControlNumber?: string | null;
  controlSerial?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  totalAmount?: number | null;
  taxAmount?: number | null;
}

export interface IInvoicePrevalidationResult {
  isValidInvoice: boolean;
  documentKind?: string | null;
  confidence?: number | null;
  extractionMethod?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  fields?: IInvoiceExtractedFields | null;
  checks?: string[] | null;
  issues?: string[] | null;
  textExcerpt?: string | null;
  matchedVendorId?: number | null;
  matchedVendorName?: string | null;
  existingBillId?: number | null;
  existingBillNumber?: string | null;
}

export interface IVendorMedia {
  mediaId: number;
  vendorId?: number | null;
  organizationId?: number | null;
  fileName?: string | null;
  contentType?: string | null;
  documentKind?: string | null;
  isValidInvoice?: boolean | null;
  billNumber?: string | null;
  taxControlNumber?: string | null;
  controlSerial?: string | null;
  vendorRif?: string | null;
  vendorName?: string | null;
  billId?: number | null;
  hasData?: boolean | null;
}

export interface IVendorMediaFile {
  mediaId: number;
  fileName?: string | null;
  contentType?: string | null;
  billId?: number | null;
  fileDataBase64?: string | null;
}
