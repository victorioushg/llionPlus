export interface IJournalEntryLine {
  journalEntryId: number;
  rowNumber: number;
  accountId?: number | null;
  accountCode?: string | null;
  accountName?: string | null;
  accountDisplay?: string | null;
  referenceNumber?: string | null;
  memo?: string | null;
  debitCredit: number;
  amount?: number | null;
  debit?: number | null;
  credit?: number | null;
  sourceRule?: number | null;
  fiscalPeriod?: number | null;
  organizationId: number;
}

export interface IJournalEntryAccount {
  accountId: number;
  code: string;
  name: string;
  displayName: string;
}

export interface IJournalEntry {
  journalEntryId: number;
  journalEntryCode?: string | null;
  journalEntryDate?: Date | string | null;
  description?: string | null;
  debits?: number | null;
  credits?: number | null;
  actual?: boolean | null;
  entryKind?: string | null;
  templateOriginId?: number | null;
  lockDate?: Date | string | null;
  fiscalPeriod?: number | null;
  fiscalPeriodName?: string | null;
  organizationId: number;
  lines?: IJournalEntryLine[];
}

export function isJournalEntryLocked(
  entry: IJournalEntry | null | undefined
): boolean {
  const lockDate = entry?.lockDate;
  if (!lockDate) {
    return false;
  }
  if (lockDate instanceof Date) {
    return !Number.isNaN(lockDate.getTime());
  }
  return String(lockDate).trim().length > 0;
}

export function journalLineDisplay(line: IJournalEntryLine | null | undefined): string {
  const code = (line?.accountCode ?? '').trim();
  const name = (line?.accountName ?? '').trim();
  return [code, name].filter((part) => part.length > 0).join(' ');
}
