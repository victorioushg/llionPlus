export interface IGroup {
  groupId: number;
  description: string;
  fullName?: string;
  altern_GroupCode: string;
  parent_GroupCode: number;
  groupModule: string;
  entityId: number;
  organizationId: number;
}
