import { IUserOrganizationInfo } from './authenticated-response.model';

export class User {
  username!: string;
  password!: string;
  token!: string;
  userId?: number;
  organizations?: IUserOrganizationInfo[];
  defaultOrganizationId?: number;
  defaultOrganizationName?: string;
  workingOrganizationId?: number;
  workingOrganizationName?: string;
}
