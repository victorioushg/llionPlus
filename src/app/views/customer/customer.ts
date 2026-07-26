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
