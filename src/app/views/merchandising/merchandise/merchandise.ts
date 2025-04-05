export interface IMerchandise {
  merchandiseEntityId: number;
  description: string;
  brand: string;
  category: string;
  hierarchyId: number;
  presentation: string;
  deactivated: boolean;
  merchandiseType: string;
  discuount: number;
  salesQuota: number;
  refund: number;
  refundRate: number;
  mix: number;
  accountCode: number;
  accountName: string;
  classCode: number;
  className: string;
  addedOn: Date;
  addedBy: string;
  lastModifiedOn: Date;
  lastModifiedBy: string;
  organizationId: number;
  parentId: number;
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
