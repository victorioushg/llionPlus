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
