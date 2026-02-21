export interface IMerchandise {
  merchandiseId: number;
  alternCode: string;
  name: string;
  description: string;
  groupId: number;
  brandId: number;
  typeId: number;
  divisionId: number;
  deactivated: boolean;
  acceptsReturns: boolean;
  acceptsReturnsRate: number;
  currentStock: number;
  availableStock: number;
  marketShare: number;
  regulated: boolean;
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
  brandId: number;
  brandDescription: string;
}

export interface IMerchandiseCategory {
  categoryId: number;
  categoryDescription: string;
}

export interface IMerchandiseDivision {
  divisionId: number;
  divisionDescription: string;
}
export interface IMerchandiseType {
  typeId: number;
  typeDescription: string;
}
