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
