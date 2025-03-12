
export interface IMerchandise {
  merchandiseEntityId: number; 
  description: string;
  brand: string;
  groupId: number; 
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
  classCode: number,
  className: string; 
  addedOn: Date; 
  addedBy: string; 
  lastModifiedOn: Date; 
  lastModifiedBy: string; 
  organizationId: number;  
  parentId: number;
}

export interface IOrganizationType {
  organizationType: string;
  typeDescription: string,  
}

export interface IAssosiationType {
  assosiationType: string;
  typeDescription: string;
}