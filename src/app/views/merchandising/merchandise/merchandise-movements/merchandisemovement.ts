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
  /** UI-only: unit cost used to compute totalCost */
  unitCost?: number | null;
  totalCost?: number | null;
  totalCostWithDiscount?: number | null;
  origin?: string | null;
  documentOrigin?: string | null;
  customer_Provider?: number | string | null;
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
  /** UI-only lot picker (not persisted yet) */
  lotNumber?: string | null;
  /** Maps to mer_merchandise_movements.Comen */
  comment?: string | null;
  /** Display-only from joins (GET) */
  salesPersonName?: string | null;
  customerProviderName?: string | null;
  warehouse?: string | null;
}

export interface IMerchandiseLastUnitCost {
  merchandiseId?: number;
  uom?: string | null;
  quantity?: number | null;
  totalCost?: number | null;
  unitCost?: number | null;
  movementDate?: Date | string | null;
  movementId?: number | null;
}

export interface IMerchandiseWithMovements {
  merchandise: IMerchandise;
  movements: IMerchandiseMovement[];
}
