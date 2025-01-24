export interface IAddress {
  
  addressId: number;
  addressTypeId: string;
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
  organizationId:number;  

}

export interface IAddressType {
  addressTypeId: string;
  typeDescription: string;
}
