export interface IMerchandise {
  merchandiseId: number;
  alternCode: string; 
  name: string;
  description: string;
  groupId: number;
  brandId: number;
  deactivated: boolean;
  acceptsReturns: boolean; 
  acceptsReturnsRate: number;
  currentStock: number;
  availableStock: number; 
  marketShare: number; 
  regulated: boolean; 
  merchandiseType: number;
  AcceptsRebate: boolean; 
  height: number;
  width: number;
  depth: number;
  createdOn: Date; 
  createddBy: string;
  LastModifiedOn: Date;
  accountId: number;
  classId: number;   
  parentId: number; 
  organizationId: number;
}

export interface IMerchandiseBrand {
  groupCode: string;
  description: string;
  parent_GroupCode: string;
  groupModule: string;
  entityId: number;
  organizationId: number;
}

export interface IMerchandiseCategory {
  groupCode: string;
  description: string;
  parent_GroupCode: string;
  groupModule: string;
  entityId: number;
  organizationId: number;
}
