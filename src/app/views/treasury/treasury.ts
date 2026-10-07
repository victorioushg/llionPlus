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
  originDocumentId?: number | null;
  originType?: string | null;
  beneficiary?: string | null;
  paymentType?: string | null;
  paymentReceipt?: string | null;
  paymentReference?: string | null;
  reconciled?: boolean | null;
  reconciledMonth?: Date | string | null;
  reconciledDate?: Date | string | null;
  batchCancellation?: boolean | null;
  journalEntryNumber?: string | null;
  journalEntryDate?: string | null;
  customer_Provider?: number | null;
  salesPersonId?: number | null;
  partyName?: string | null;
  salesPersonName?: string | null;
  accountId?: number | null;
  classId?: number | null;
  lock_Date?: Date | string | null;
  fiscalPeriod?: number | null;
  organizationId: number;
}

export interface ICashMovementTotals {
  cashAmount: number;
  checkAmount: number;
  cardAmount: number;
  voucherAmount: number;
  totalAmount: number;
}

export interface IBankMovementTotals {
  depositAmount: number;
  creditNoteAmount: number;
  debitNoteAmount: number;
  checkAmount: number;
  totalAmount: number;
}

export const TREASURY_BANK_MOVEMENT_TYPES = [
  { code: 'DP', description: 'DEPOSITO' },
  { code: 'NC', description: 'NOTA CREDITO' },
  { code: 'CH', description: 'CHEQUE' },
  { code: 'ND', description: 'NOTA DEBITO' },
];

export const TREASURY_BANK_DEPOSIT_TYPES = [
  { code: 'NM', description: 'NORMAL' },
  { code: 'DF', description: 'DIFERIDO' },
];

export const TREASURY_CASH_MOVEMENT_TYPES = [
  { code: 'EN', description: 'ENTRADA' },
  { code: 'SA', description: 'SALIDA' },
];

export const TREASURY_CASH_PAYMENT_TYPES = [
  { code: 'EF', description: 'Efectivo' },
  { code: 'CH', description: 'Cheque' },
  { code: 'TA', description: 'Tarjeta' },
  { code: 'CT', description: 'Cupón de Alimentación' },
  { code: 'DP', description: 'Depósito' },
  { code: 'TR', description: 'Transferencia' },
];

/** @deprecated use TREASURY_BANK_MOVEMENT_TYPES / TREASURY_CASH_MOVEMENT_TYPES */
export const TREASURY_MOVEMENT_TYPES = TREASURY_BANK_MOVEMENT_TYPES;
