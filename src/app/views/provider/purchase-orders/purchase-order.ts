export interface IPurchaseOrder {
  poId: number;
  poNumber: string;
  poSeriesCode?: string | null;
  providerId?: number | null;
  providerName?: string | null;
  issueDate?: Date | string | null;
  deliveryDate?: Date | string | null;
  totalItems?: number | null;
  totalCost?: number | null;
  totalPurchaseOrder?: number | null;
  status?: number | null;
  lockedDate?: Date | string | null;
  organizationId: number;
}
