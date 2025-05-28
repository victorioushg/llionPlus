export interface IUser {
  userId: number;
  userName: string;
  email: string;
  phoneNumber: string;
  deactivated?: number;
  firstName: string;
  lastName: string
  displayName: string; 
  orgs: IUserOrganization[]; 
  roles: IRole[]; 
}

export interface IRole {
  roleName: string;
  rank: number;  
}

export interface IUserOrganization {
  organizationId: number;
  defaultOrganization: boolean;  
}