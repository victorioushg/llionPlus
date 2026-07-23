export interface IAddress {
  addressId: number;
  addressTypeId: number | string;
  typeDescription?: string | null;
  address1: string;
  address2: string;
  address3: string;
  city: string;
  county: string;
  state: string;
  country: string;
  postalCode: string;
  displayAddress: string;
  entityId: number;
  organizationId: number;
}

export interface IAddressType {
  addressTypeId: number | string;
  typeDescription: string;
}

