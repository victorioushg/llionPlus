export interface IProvider {
  providerId: number;
  alternCode: string;
  description: string;
  providerCategoryId?: number | null;
  providerGroupId?: number | null;
  taxRegistrationID: string;
  taxRegistrationID2?: string | null;
  taxCustomerTypeId?: number | null;
  providerAssignedCode?: string | null;
  debitLimit?: number | null;
  debitAvailable?: number | null;
  termsId?: number | null;
  deactivated?: boolean | null;
  status?: string | null;
  comment?: string | null;
  createdON?: Date | string | null;
  organizationId: number;
}
