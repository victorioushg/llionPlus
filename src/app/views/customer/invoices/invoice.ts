export interface IInvoiceLine {
  invoiceId: number;
  invoiceRowNumber: number;
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
  invoiceRowType?: number | null;
  invoiceRowTypeName?: string | null;
}

export interface IInvoiceTax {
  invoiceId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface IInvoiceDiscount {
  invoiceId: number;
  invoiceDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalInvoice?: number | null;
}

export interface IInvoice {
  invoiceId: number;
  invoiceNumber: string;
  invoiceSeriesCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  billingPrice?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  warehouseId?: number | null;
  reference?: string | null;
  creditCash?: number | null;
  creditTerm?: number | null;
  paymentTreasuryId?: number | null;
  paymentDocument?: string | null;
  updateInventory?: number | null;
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
  totalInvoice?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IInvoiceLine[] | null;
  taxes?: IInvoiceTax[] | null;
  discounts?: IInvoiceDiscount[] | null;
}

export type { ISalesman } from '../customer';
