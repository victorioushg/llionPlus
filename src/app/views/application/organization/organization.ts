import { IAddress } from "@shared/components/address/address";
import { IPhone } from "@shared/components/phones/phone";
import { IEmail } from "@shared/components/email/email";
import { IAppEntity } from "@shared/models/entity";

export type { IAppEntity };

export interface IOrganization {
  organizationId: number;
  name: string;
  activity: string;
  taxRegistrationID: string;
  taxRegistrationDescription: string;
  organizationType: string;
  assosiationType: string; 
  deactivated?: number;
  addedBy?: number;
  addedOn?: Date;
  lastUpdatedBy?: number;
  lastUpdatedOn?: Date;
  addresses: IAddress[];
  phones: IPhone[];
  emails: IEmail[];
  default: boolean;
  currency: string;
  logoData: string;
  logoName: string
  parentId: number
}

export interface IOrganizationType {
  organizationType: string;
  typeDescription: string,  
}

export interface IAssosiationType {
  assosiationType: string;
  typeDescription: string;
}

export interface ICurrency {
  currency: string;
  alphabeticCode: string;
}

export interface IOrganizationTax {
  taxId: number;
  taxType: string;
  description?: string;
  taxDateFrom: Date;
  taxDateTo?: Date | null;
  rateType: string;
  rate: number;
  taxBaseAmountFrom?: number;
  taxBaseAmountTo?: number;
  organizationId: number;
  applicableTo?: string;
}

/** Retenciones fiscales por organización (app_tax_retentions) */
export interface IOrganizationTaxRetention {
  taxRetentionId: number;
  retentionCode: string;
  description: string;
  taxBaseRate?: number | null;
  taxRate?: number | null;
  minPaymentAmount?: number | null;
  substratedAmount?: number | null;
  taxerType?: string | null;
  accumulated?: boolean | null;
  retentionType?: string | null;
  comment?: string | null;
  accountId?: number | null;
  classId?: number | null;
  organizationId: number;
}

export interface IOrganizationExchangeRate {
  rowKey?: string;
  interchangeDate: Date;
  currency: string;
  amount: number;
  organizationId: number;
  /** Used only for update to locate the original row */
  originalInterchangeDate?: Date | null;
  originalCurrency?: string | null;
}

export interface IOrganizationParameter {
  parameterId: number;
  description: string;
  parameterType: string;
  value: string;
  module: string;
  organizationId: number;
}

/** Causas de créditos (0) / débitos (1) por organización */
export interface IOrganizationCreditDebit {
  creditDebitId: number;
  code: string;
  description: string;
  /** 0 = Crédito, 1 = Débito */
  creditDebitFlag: number;
  movesInventory: boolean;
  validateSalesUnit: boolean;
  adjustPrice: boolean;
  goodCondition: boolean;
  organizationId: number;
}

export interface IParameterType {
  parameterType: string;
}

export interface IOrigin {
  origin: string;
  originDescription?: string;
  originEnglish?: string;
  entityId?: number | null;
  /** Same as origin — value stored in app_parameters.Module */
  module: string;
  /** Label shown in dropdown */
  displayText?: string;
}