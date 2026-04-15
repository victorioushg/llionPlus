import { IMerchandise } from "../merchandise";

export interface IMerchandiseMovement {
  merchandiseId: number;
  movementDate: Date;
  movementType: string;
  documentNumber: string;
  quantity: number;
  uom: string;
  weight?: number;
  totalcost?: number;
  totalcostwithdiscount?: number;
  origin: string;
  documentorigin: string;
  customer_provider?: number;
  totalsale?: number;
  totalsalewithdiscount?: number;
  sellerid?: number;
  workhouseid: number;
  block_date?: Date;
  createdon?: Date;
  createdby: string;
  fiscalperiod?: number;
  
  accountId?: number;
  classId?: number;
  parentId?: number;
  organizationId: number;
  historic? : boolean; 
}

export interface IMerchandiseWithMovements {
  merchandise: IMerchandise;
  movements: IMerchandiseMovement[];
}