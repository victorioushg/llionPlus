export const PROVIDER_MOVEMENT_TYPES = [
  { code: 'FC', description: 'Factura (FC)' },
  { code: 'CA', description: 'Cancelación (CA)' },
  { code: 'NC', description: 'Nota de crédito (NC)' },
  { code: 'ND', description: 'Nota de débito (ND)' },
  { code: 'AB', description: 'Anticipo / Abono (AB)' },
  { code: 'GR', description: 'Gasto (GR)' },
];

export const PROVIDER_PAYMENT_METHODS = [
  { code: 'TR', description: 'Transferencia (TR)' },
  { code: 'CH', description: 'Cheque (CH)' },
  { code: 'EF', description: 'Efectivo (EF)' },
  { code: 'DP', description: 'Depósito (DP)' },
];

const PROVIDER_CREDIT_TYPES = new Set(['CA', 'NC', 'AB']);

export function providerMovementCreditDebit(movementType: string | null | undefined): number {
  return PROVIDER_CREDIT_TYPES.has((movementType || '').trim().toUpperCase())
    ? 1
    : 0;
}

export interface IProviderMovement {
  movementId: number;
  providerId: number;
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
  treasuryName?: string | null;
  treasuryType?: string | null;
  paymentReceipt?: string | null;
  beneficiary?: string | null;
  origin?: string | null;
  originDocument?: string | null;
  cancellationDocumentType?: string | null;
  creditDebit: number;
  historic?: number | null;
  fiscalPeriod?: number | null;
  organizationId: number;
}

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
