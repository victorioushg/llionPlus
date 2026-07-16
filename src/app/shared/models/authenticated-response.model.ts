export interface IUserOrganizationInfo {
  organizationId: number;
  name: string;
  defaultOrganization: boolean;
}

export interface AuthenticatedResponse {
  token: string;
  userId?: number;
  userName?: string;
  organizations?: IUserOrganizationInfo[];
  defaultOrganizationId?: number;
  defaultOrganizationName?: string;
}
