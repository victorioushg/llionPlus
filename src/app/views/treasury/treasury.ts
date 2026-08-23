/** BAN = banco, CAJ = caja */
export const TREASURY_TYPE_BANK = 'BAN';
export const TREASURY_TYPE_CASHBOX = 'CAJ';

export interface ITreasury {
  treasuryId: number;
  alternCode: string;
  treasuryName: string;
  treasuryAccountNumber?: string | null;
  treasuryType?: string | null;
  actualBalance?: number | null;
  accountId?: number | null;
  classId?: number | null;
  deactivated?: boolean | null;
  currencyId?: number | null;
  createdOn?: Date | string | null;
  organizationId: number;
}

export interface ITreasuryMovement {
  movementId: number;
  treasuryId: number;
  movementDate: Date | string;
  movementDocument: string;
  movementType: string;
  concept?: string | null;
  amount?: number | null;
  origin?: string | null;
  originDocument?: string | null;
  originType?: string | null;
  beneficiary?: string | null;
  paymentReceipt?: string | null;
  reconciled?: boolean | null;
  reconciledMonth?: Date | string | null;
  reconciledDate?: Date | string | null;
  batchCancellation?: boolean | null;
  journalEntryNumber?: string | null;
  journalEntryDate?: string | null;
  customer_Provider?: number | null;
  salesPersonId?: number | null;
  accountId?: number | null;
  classId?: number | null;
  lock_Date?: Date | string | null;
  fiscalPeriod?: number | null;
  organizationId: number;
}

export const TREASURY_BANK_MOVEMENT_TYPES = [
  { code: 'DP', description: 'Depósito (DP)' },
  { code: 'ND', description: 'Nota de débito (ND)' },
  { code: 'CH', description: 'Cheque (CH)' },
  { code: 'NC', description: 'Nota de crédito (NC)' },
];

export const TREASURY_CASH_MOVEMENT_TYPES = [
  { code: 'EN', description: 'Entrada (EN)' },
  { code: 'SA', description: 'Salida (SA)' },
];

/** @deprecated use TREASURY_BANK_MOVEMENT_TYPES / TREASURY_CASH_MOVEMENT_TYPES */
export const TREASURY_MOVEMENT_TYPES = TREASURY_BANK_MOVEMENT_TYPES;
