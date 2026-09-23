export interface IAccountClass {
  classId: number;
  name?: string | null;
  fullName?: string | null;
  isActive?: boolean | null;
  parentId?: number | null;
  parentFullName?: string | null;
  subLevel?: number | null;
}

export interface IClassTreeRow extends IAccountClass {
  subtasks?: IClassTreeRow[];
}
