export interface ICreditNoteLine {
  creditNoteId: number;
  creditNoteRowNumber: number;
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
  creditNoteRowType?: number | null;
  creditNoteRowTypeName?: string | null;
}

export interface ICreditNoteTax {
  creditNoteId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface ICreditNoteDiscount {
  creditNoteId: number;
  creditNoteDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalCreditNote?: number | null;
}

export interface ICreditNote {
  creditNoteId: number;
  creditNoteNumber: string;
  creditNoteSeriesCode?: string | null;
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
  totalCreditNote?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: ICreditNoteLine[] | null;
  taxes?: ICreditNoteTax[] | null;
  discounts?: ICreditNoteDiscount[] | null;
}

export type { ISalesman } from '../customer';
