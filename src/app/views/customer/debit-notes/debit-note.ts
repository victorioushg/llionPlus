export interface IDebitNoteLine {
  debitNoteId: number;
  debitNoteRowNumber: number;
  merchandiseId?: number | null;
  itemCode?: string | null;
  description?: string | null;
  taxCode?: string | null;
  taxRate?: number | null;
  quantity?: number | null;
  unit?: string | null;
  weight?: number | null;
  priceByUnit?: number | null;
  merchandiseDiscount?: number | null;
  customerDiscount?: number | null;
  priceOfferDiscount?: number | null;
  totalPrice?: number | null;
  totalDiscount?: number | null;
  totalPriceAndDiscounts?: number | null;
  debitNoteRowType?: number | null;
  debitNoteRowTypeName?: string | null;
}

export interface IDebitNoteTax {
  debitNoteId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface IDebitNoteDiscount {
  debitNoteId: number;
  debitNoteDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalDebitNote?: number | null;
}

export interface IDebitNote {
  debitNoteId: number;
  debitNoteNumber: string;
  debitNoteSeriesCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  billingPrice?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  warehouseId?: number | null;
  reference?: string | null;
  invoiceId?: number | null;
  comment?: string | null;
  salesmanId?: number | null;
  salesmanName?: string | null;
  accountId?: number | null;
  classId?: number | null;
  totalItems?: number | null;
  totalWeight?: number | null;
  totalPrice?: number | null;
  totalDiscounts?: number | null;
  totalTaxes?: number | null;
  totalDebitNote?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IDebitNoteLine[] | null;
  taxes?: IDebitNoteTax[] | null;
  discounts?: IDebitNoteDiscount[] | null;
}

export type { ISalesman } from '../customer';
