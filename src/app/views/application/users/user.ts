export interface IUser {
  userId: number;
  userName: string;
  email: string;
  phoneNumber: string;
  deactivated?: number;
  firstName: string;
  lastName: string
  displayName: string; 
  orgs: string[]; 
  rols: string[]; 
}

export interface IRole {
  roleName: string;
  rank: number;  
}