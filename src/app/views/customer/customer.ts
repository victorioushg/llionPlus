export interface ICustomerMovement {
  movementId: number;
  customerId: number;
  movementDate: Date | string;
  movementType: string;
  documentNumber: string;
  dueDate?: Date | string | null;
  reference?: string | null;
  concept?: string | null;
  amount?: number | null;
  vatPortion?: number | null;
  paymentMethod?: string | null;
  paymentDocument?: string | null;
  treasuryId?: number | null;
  paymentReceipt?: string | null;
  origin?: string | null;
  originDocument?: string | null;
  debitCredit: number;
  salesPersonId?: number | null;
  collectorId?: number | null;
  fiscalPeriod?: number | null;
  organizationId: number;
}

export interface ICustomer {
  customerId: number;
  alternCode: string;
  description: string;
  customerCategoryId?: number | null;
  customerGroupId?: number | null;
  taxRegistrationID: string;
  taxRegistrationID2?: string | null;
  taxCustomerTypeId?: number | null;
  creditLimit?: number | null;
  creditAvailable?: number | null;
  termsId?: number | null;
  billingPrice?: string | null;
  deactivated?: boolean | null;
  acceptBackOrders?: boolean | null;
  sharedCustomer?: boolean | null;
  status?: string | null;
  comment?: string | null;
  createdON?: Date | string | null;
  organizationId: number;
}
