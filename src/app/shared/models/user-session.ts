export interface IUserSession {
  sessionId: number;
  userId: number;
  organizationId: number;
  machineName: string;
  fiscalPrinterId: number;
  fiscalPrinterCode?: string;
  printerType?: number;
  printerTypeName?: string;
  fiscalMachine?: string;
  port?: string;
  fiscalPrinterDescription?: string;
  ipAddress?: string;
  loginAt?: string;
  logoutAt?: string | null;
}

export interface ISessionOpenRequest {
  userId: number;
  organizationId: number;
  machineName: string;
  fiscalPrinterId: number;
}

export function sessionPrinterLabel(session: IUserSession): string {
  const type = session.printerTypeName || '';
  const code = session.fiscalPrinterCode || '';
  const serial = (session.fiscalMachine || '').trim();
  return [code, type, serial].filter(Boolean).join(' · ');
}
