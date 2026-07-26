export interface IAccount {
  accountId: number;
  code: string;
  description: string;
  level?: number | null;
  mark?: boolean | null;
  organizationId: number;
}
