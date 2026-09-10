export interface ISalesOrderLine {
  salesOrderId: number;
  salesOrderRowNumber: number;
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
  salesOrderRowType?: number | null;
  salesOrderRowTypeName?: string | null;
}

export interface ISalesOrderTax {
  salesOrderId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface ISalesOrderDiscount {
  salesOrderId: number;
  salesOrderDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalSalesOrder?: number | null;
}

export interface ISalesOrder {
  salesOrderId: number;
  salesOrderNumber: string;
  salesOrderSeriesCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  billingPrice?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  deliveryDate?: Date | string | null;
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
  totalSalesOrder?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: ISalesOrderLine[] | null;
  taxes?: ISalesOrderTax[] | null;
  discounts?: ISalesOrderDiscount[] | null;
}

export type { ISalesman } from '../customer';
