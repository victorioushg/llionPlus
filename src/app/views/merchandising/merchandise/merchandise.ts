export interface IMerchandise {
  merchandiseId: number;
  alternCode: string;
  name: string;
  description: string;
  groupId: number;
  brandId: number;
  typeId: number;
  divisionId: number;
  deactivated: boolean;
  acceptsReturns: boolean;
  acceptsReturnsRate: number;
  currentStock: number;
  availableStock: number;
  marketShare: number;
  regulated: boolean;
  acceptsRebate: boolean;
  height: number;
  width: number;
  depth: number;
  createdOn: Date;
  createddBy: string;
  LastModifiedOn: Date;
  accountId: number;
  classId: number;
  parentId: number;
  organizationId: number;
  /** @deprecated Prefer mer_merchandise_tax grid */
  ivaRateType?: string | null;
}

export interface IMerchandiseTax {
  merchandiseId: number;
  taxType: string;
  rateType: string;
  organizationId: number;
  /** Rate from app_taxes for TaxType + RateType */
  rate?: number | null;
  /** Previous TaxType — used to locate the row on update */
  originalTaxType?: string | null;
  /** Previous RateType — used to locate the row on update */
  originalRateType?: string | null;
}

export interface IMerchandiseMedia {
  merchandiseId: number;
  merchandiseFileName: string;
  comment?: string | null;
  /** Base64 file payload for insert/update */
  merchandiseDataBase64?: string | null;
  hasData?: boolean | null;
  /** Previous file name — used to locate the row on update */
  originalFileName?: string | null;
}

export interface IMerchandiseProfile {
  merchandiseId: number;
  profileDate?: Date | string | null;
  description?: string | null;
  deactivated?: boolean | null;
  cause?: string | null;
  organizationId?: number | null;
  /** Previous ProfileDate — used to locate the row on update */
  originalProfileDate?: Date | string | null;
  /** Previous Description — used to locate the row on update */
  originalDescription?: string | null;
}

export interface IMerchandiseBrand {
  brandId: number;
  brandDescription: string;
}

export interface IMerchandiseCategory {
  categoryId: number;
  categoryDescription: string;
}

export interface IMerchandiseDivision {
  divisionId: number;
  divisionDescription: string;
}
export interface IMerchandiseType {
  typeId: number;
  typeDescription: string;
}

export interface IMerchandiseUom {
  uom: string;
  equivalence: number;
  uomEquivalent: string;
  defaultUnit: boolean;
  divisible: boolean;
  retail: boolean;
  wholeSale: boolean;
  weight: number;
  merchandiseId: number;
}

export interface IMerchandiseCode {
  merchandiseId?: number | null;
  description?: string | null;
  code: string;
  merchandiseCodeType?: string | null;
  organizationId?: number | null;
  /** Previous code — used to locate the row on update */
  originalCode?: string | null;
}

export interface IMerchandisePrice {
  priceCode: string;
  priceValue: number;
  priceDiscount: number;
  priceBid: boolean;
  priceProfit: number;
  linearProfit: boolean;
  priceBarCode: string;
  dateFrom: Date;
  dateTo: Date;
  merchandiseId: number;
}
