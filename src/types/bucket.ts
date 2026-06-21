export interface BucketReturn {
  id: string;
  customerId: string;
  orderId?: string;
  quantity: number;
  createdAt: string;
}

export type BucketReturnFormData = Omit<BucketReturn, 'id' | 'createdAt'>;
