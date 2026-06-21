export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  floor: string;
  preferredBrand: string;
  emptyBuckets: number;
  depositBuckets: number;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export type CustomerFormData = Omit<Customer, 'id' | 'createdAt'>;
