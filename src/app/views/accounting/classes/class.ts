export interface IAccountClass {
  classId: number;
  name?: string | null;
  fullName?: string | null;
  isActive?: boolean | null;
}

export interface IClass {
  classId: number;
  classCode: string;
  description: string;
  level: number;
  outcomeAccount: number;
  organization: number;
}
