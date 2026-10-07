/** QuickBooks-aligned AccountType values (acc_account.AccountType). */
export type AccountType =
  | 'OtherExpense'
  | 'CreditCard'
  | 'FixedAsset'
  | 'OtherCurrentLiability'
  | 'OtherIncome'
  | 'LongTermLiability'
  | 'OtherAsset'
  | 'OtherCurrentAsset'
  | 'Equity'
  | 'Bank'
  | 'AccountsPayable'
  | 'Income'
  | 'AccountsReceivable'
  | 'Expense'
  | 'NonPosting'
  | 'CostOfGoodsSold';

/** QuickBooks SpecialAccountType values. */
export type SpecialAccountType =
  | 'InventoryAssets'
  | 'ReconciliationDifferences'
  | 'UndepositedFunds'
  | 'PayrollExpenses'
  | 'AccountsPayable'
  | 'AccountsReceivable'
  | 'CondenseItemAdjustmentExpenses'
  | 'CostOfGoodsSold'
  | 'DirectDepositLiabilities'
  | 'Estimates'
  | 'ExchangeGainLoss'
  | 'ItemReceiptAccount'
  | 'OpeningBalanceEquity'
  | 'PayrollLiabilities'
  | 'PettyCash'
  | 'PurchaseOrders'
  | 'RetainedEarnings'
  | 'SalesOrders'
  | 'SalesTaxPayable'
  | 'UncategorizedExpenses'
  | 'UncategorizedIncome';

export type CashFlowClassification =
  | 'NotApplicable'
  | 'None'
  | 'Investing'
  | 'Operating'
  | 'Financing';

/**
 * Mirrors llionAPI.Models.Accounts.AccountMovement / acc_account_movements.
 */
export interface IAccountMovement {
  movementId: number;
  movementKey?: string | null;
  journalEntryId?: number | null;
  rowNumber?: number | null;
  accountId?: number | null;
  accountCode?: string | null;
  classId?: number | null;
  movementDate?: Date | string | null;
  journalDescription?: string | null;
  reference?: string | null;
  movementDescription?: string | null;
  /** true = Debe, false = Haber */
  movementType?: boolean | null;
  movementTypeLabel?: string | null;
  amount?: number | null;
  fiscalPeriod?: number | null;
  organizationId?: number | null;
}

export interface IAccountMonthlyBalance {
  monthNumber: number;
  monthName: string;
  fiscalYear: number;
  debits: number;
  credits: number;
  balance: number;
}

/**
 * Mirrors llionAPI.Models.Accounts.Account / acc_account
 * (QuickBooks Account-shaped chart of accounts).
 */
export interface IAccount {
  accountId: number;
  code: string;
  name: string;
  fullName?: string | null;
  isActive?: boolean | null;
  parentId?: number | null;
  /** JSON for C# ParentId_FullName */
  parentId_FullName?: string | null;
  subLevel?: number | null;
  mark?: boolean | null;
  accountType?: AccountType | null;
  specialAccountType?: SpecialAccountType | null;
  isTaxAccount?: boolean | null;
  treasureId?: number | null;
  /** Maps to acc_account.Desc / C# Desc */
  desc?: string | null;
  balance?: number | null;
  totalBalance?: number | null;
  openBalance?: number | null;
  openBalanceDate?: Date | string | null;
  cashFlowClassification?: CashFlowClassification | null;
  salesTaxCodeId?: number | null;
  salesTaxCodeFullName?: string | null;
  taxLineId?: number | null;
  taxLineName?: string | null;
  currencyFullName?: string | null;
  currencyId?: number | null;
  organizationId: number;

  /** UI / dropdown alias — prefer name or desc */
  description?: string | null;
  /** UI alias for parentId_FullName */
  parentFullName?: string | null;
}
