export interface IDeliveryNoteLine {
  deliveryNoteId: number;
  deliveryNoteRowNumber: number;
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
  deliveryNoteRowType?: number | null;
  deliveryNoteRowTypeName?: string | null;
}

export interface IDeliveryNoteTax {
  deliveryNoteId: number;
  taxCode?: string | null;
  taxRate?: number | null;
  taxBase?: number | null;
  totalTax?: number | null;
}

export interface IDeliveryNoteDiscount {
  deliveryNoteId: number;
  deliveryNoteDiscountRowNumber: number;
  description?: string | null;
  discountRate?: number | null;
  totalDiscount?: number | null;
  subtotalDeliveryNote?: number | null;
}

export interface IDeliveryNote {
  deliveryNoteId: number;
  deliveryNoteNumber: string;
  deliveryNoteSeriesCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  billingPrice?: string | null;
  issueDate?: Date | string | null;
  dueDate?: Date | string | null;
  warehouseId?: number | null;
  reference?: string | null;
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
  totalDeliveryNote?: number | null;
  status?: number | null;
  statusName?: string | null;
  lockedDate?: Date | string | null;
  organizationId: number;
  lines?: IDeliveryNoteLine[] | null;
  taxes?: IDeliveryNoteTax[] | null;
  discounts?: IDeliveryNoteDiscount[] | null;
}

export type { ISalesman } from '../customer';
