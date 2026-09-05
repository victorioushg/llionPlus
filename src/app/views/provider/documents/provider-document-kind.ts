export type ProviderDocumentKind =
  | 'goodsReceipt'
  | 'purchase'
  | 'creditNote'
  | 'debitNote';

export interface IProviderDocumentKindConfig {
  kind: ProviderDocumentKind;
  apiPath: string;
  title: string;
  numberLabel: string;
  listNumberHeader: string;
  placeholder: string;
  totalLabel: string;
  deleteSuccess: string;
  selectWarning: string;
  showIssueDateTax: boolean;
  showDueDate: boolean;
  showReference: boolean;
  showWarehouse: boolean;
  showRelatedBill: boolean;
  showSeries: boolean;
  showTaxControl: boolean;
  showCreditCash: boolean;
  showCreditTerm: boolean;
  /** Fecha usada para tomar la última tasa de app_taxes (IVA). */
  taxDateField: 'issueDate' | 'issueDateTax';
  showDiscounts: boolean;
  showTransit: boolean;
  showAcceptanceRate: boolean;
  showReason: boolean;
}

export const PROVIDER_DOCUMENT_KINDS: Record<
  ProviderDocumentKind,
  IProviderDocumentKindConfig
> = {
  goodsReceipt: {
    kind: 'goodsReceipt',
    apiPath: 'goodsreceipts',
    title: 'Recepciones de mercancías',
    numberLabel: 'Recepción No.',
    listNumberHeader: 'Nº recepción',
    placeholder: 'Seleccione una recepción de mercancías',
    totalLabel: 'TOTAL Recepción',
    deleteSuccess: 'Recepción eliminada',
    selectWarning: 'Debe seleccionar una recepción',
    showIssueDateTax: true,
    showDueDate: false,
    showReference: true,
    showWarehouse: true,
    showRelatedBill: false,
    showSeries: false,
    showTaxControl: false,
    showCreditCash: false,
    showCreditTerm: false,
    taxDateField: 'issueDateTax',
    showDiscounts: true,
    showTransit: true,
    showAcceptanceRate: false,
    showReason: false,
  },
  purchase: {
    kind: 'purchase',
    apiPath: 'purchases',
    title: 'Compras',
    numberLabel: 'Compra No.',
    listNumberHeader: 'Nº compra',
    placeholder: 'Seleccione una compra',
    totalLabel: 'TOTAL Compra',
    deleteSuccess: 'Compra eliminada',
    selectWarning: 'Debe seleccionar una compra',
    showIssueDateTax: true,
    showDueDate: true,
    showReference: true,
    showWarehouse: true,
    showRelatedBill: false,
    showSeries: true,
    showTaxControl: true,
    showCreditCash: true,
    showCreditTerm: false,
    taxDateField: 'issueDateTax',
    showDiscounts: true,
    showTransit: false,
    showAcceptanceRate: false,
    showReason: false,
  },
  creditNote: {
    kind: 'creditNote',
    apiPath: 'creditnotes',
    title: 'Notas crédito',
    numberLabel: 'Nota crédito No.',
    listNumberHeader: 'Nº nota',
    placeholder: 'Seleccione una nota crédito',
    totalLabel: 'TOTAL Nota crédito',
    deleteSuccess: 'Nota crédito eliminada',
    selectWarning: 'Debe seleccionar una nota crédito',
    showIssueDateTax: true,
    showDueDate: true,
    showReference: true,
    showWarehouse: true,
    showRelatedBill: true,
    showSeries: false,
    showTaxControl: false,
    showCreditCash: false,
    showCreditTerm: false,
    taxDateField: 'issueDateTax',
    showDiscounts: false,
    showTransit: false,
    showAcceptanceRate: true,
    showReason: false,
  },
  debitNote: {
    kind: 'debitNote',
    apiPath: 'debitnotes',
    title: 'Notas débito',
    numberLabel: 'Nota débito No.',
    listNumberHeader: 'Nº nota',
    placeholder: 'Seleccione una nota débito',
    totalLabel: 'TOTAL Nota débito',
    deleteSuccess: 'Nota débito eliminada',
    selectWarning: 'Debe seleccionar una nota débito',
    showIssueDateTax: true,
    showDueDate: true,
    showReference: true,
    showWarehouse: true,
    showRelatedBill: true,
    showSeries: false,
    showTaxControl: false,
    showCreditCash: false,
    showCreditTerm: false,
    taxDateField: 'issueDateTax',
    showDiscounts: false,
    showTransit: false,
    showAcceptanceRate: true,
    showReason: true,
  },
};
