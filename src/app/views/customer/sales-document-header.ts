import { IPaymentTerm, toCreditCash } from '../provider/provider';
import { ICustomer } from './customer';

export function addDays(value: Date, days: number): Date {
  const next = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  next.setDate(next.getDate() + (Number(days) || 0));
  return next;
}

export function dueDateFromCredit(
  issueDate: Date | null,
  creditCash: unknown,
  termsId: number,
  terms: IPaymentTerm[]
): Date | null {
  if (!issueDate) {
    return null;
  }
  if (toCreditCash(creditCash) === 1) {
    return issueDate;
  }
  const term = terms.find((row) => row.termsId === termsId);
  const days = termsId > 0 ? Number(term?.rangeDays) || 0 : 0;
  return addDays(issueDate, days);
}

/** Catalog/document tax rates may be 16 (percent) or 0.16 (fraction). */
export function rateAsFraction(rate: number | null | undefined): number {
  const n = Number(rate);
  if (!Number.isFinite(n) || n === 0) {
    return 0;
  }
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function formatTaxPercent(rate: number | null | undefined): string {
  const pct = rateAsFraction(rate) * 100;
  const rounded = Math.round(pct * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text}%`;
}

export function headerFromCustomer(customer: ICustomer | undefined): {
  billingPrice: string;
  creditTerm: number | null;
  accountId: number | null;
  classId: number | null;
} {
  const termsId = Number(customer?.termsId) || 0;
  const accountId = Number(customer?.accountId) || 0;
  const classId = Number(customer?.classId) || 0;
  return {
    billingPrice: customer?.billingPrice ?? '',
    creditTerm: termsId > 0 ? termsId : null,
    accountId: accountId > 0 ? accountId : null,
    classId: classId > 0 ? classId : null,
  };
}
