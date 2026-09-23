export type ClientStatus = 'onboarding' | 'active' | 'inactive' | 'on_hold';
export type CustomerCategory = 'company' | 'person';

export interface ClientAddress {
  line1: string;
  postnummer: string;
  poststed: string;
  land: string;
}

export interface Client {
  id: string;
  name: string;
  organizationNumber: string;
  status: ClientStatus;
  customerCategory: CustomerCategory;
  address: ClientAddress;
  email: string;
  telephone: string;
  hourlyRateNok: number;
  tags: string[];
}

export const CLIENT_STATUSES: ClientStatus[] = ['onboarding', 'active', 'inactive', 'on_hold'];
