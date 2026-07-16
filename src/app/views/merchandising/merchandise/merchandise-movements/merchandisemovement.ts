import { IMerchandise } from '../merchandise';

export interface IMerchandiseMovement {
  movementId: number;
  merchandiseId: number;
  movementDate: Date;
  movementType: string;
  documentNumber: string;
  quantity: number | null;
  uom: string;
  weight?: number | null;
  organizationId: number;
  totalCost?: number | null;
  totalCostWithDiscount?: number | null;
  origin?: string | null;
  documentOrigin?: string | null;
  customer_Provider?: number | null;
  totalSale?: number | null;
  totalSaleWithDiscount?: number | null;
  salesPersonId?: number | null;
  warehouseId: number;
  createdOn?: Date | null;
  createdBy?: string | null;
  accountID?: number | null;
  classId?: number | null;
  block_Date?: Date | null;
  historic?: boolean | null;
  parentID?: number | null;
  processed?: boolean | null;
  /** Display-only from joins (GET) */
  salesPersonName?: string | null;
  customerProviderName?: string | null;
  warehouse?: string | null;
}

export interface IMerchandiseWithMovements {
  merchandise: IMerchandise;
  movements: IMerchandiseMovement[];
}
