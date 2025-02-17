import { IAddress } from "@shared/components/address/address";
import { IPhone } from "@shared/components/phones/phone";
import { IEmail } from "@shared/components/email/email";

export interface IOrganization {
  id: number;
  name: string;
  activity: string;
  taxRegistrationID: string;
  taxRegistrationDescription: string;
  organizationType: string;
  assosiationType: string; 
  deactivated?: number;
  addedBy?: number;
  addedOn?: Date;
  lastUpdatedBy?: number;
  lastUpdatedOn?: Date;
  addresses: IAddress[];
  phones: IPhone[];
  emails: IEmail[];
  default: boolean;

  logoData: string;
  logoName: string
  parentId: number
}

export interface IOrganizationType {
  organizationType: string;
  typeDescription: string,  
}

export interface IAssosiationType {
  assosiationType: string;
  typeDescription: string;
}