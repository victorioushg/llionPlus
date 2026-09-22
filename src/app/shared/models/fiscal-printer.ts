export const FISCAL_PRINTER_TYPES = [
  'Factura Normal (FORMA LIBRE)',
  'Factura pre-impresa fiscal (FORMA FISCAL PRE-IMPRESA)',
  'Aclas PPF1F3',
  'Bematech MP-2100',
  'Epson/PnP PF-220-II',
  'Bixolon SRP-350',
  'Tally Dascon 1125',
  'Bixolon SRP-812',
];

export interface IFiscalPrinter {
  fiscalPrinterId: number;
  organizationId: number;
  code: string;
  printerType: number;
  printerTypeName?: string;
  fiscalMachine?: string;
  port?: string;
  description?: string;
  displayName?: string;
}

export function fiscalPrinterTypeName(printerType: number): string {
  return FISCAL_PRINTER_TYPES[printerType] ?? String(printerType);
}

export function fiscalPrinterDisplayName(printer: IFiscalPrinter): string {
  const typeName =
    printer.printerTypeName || fiscalPrinterTypeName(printer.printerType);
  const serial = (printer.fiscalMachine || '').trim();
  const parts = [printer.code, typeName];
  if (serial) {
    parts.push(serial);
  }
  return parts.join(' · ');
}
