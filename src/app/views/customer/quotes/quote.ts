export interface IQuoteLine {
  quoteId: number;
  quoteRowNumber: number;
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
  quoteRowType?: number | null;
  quoteRowTypeName?: string | null;
}

export interface IQuoteTax {
  quoteId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface IQuoteDiscount {
  quoteId: number;
  quoteDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalQuote?: number | null;
}

export interface IQuote {
  quoteId: number;
  quoteNumber: string;
  quoteSeriesCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  billingPrice?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
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
  totalQuote?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IQuoteLine[] | null;
  taxes?: IQuoteTax[] | null;
  discounts?: IQuoteDiscount[] | null;
}

export type { ISalesman } from '../customer';
