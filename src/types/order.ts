export type OrderStatus = 'pending' | 'assigned' | 'delivering' | 'completed' | 'cancelled';

export const DELIVERY_TIME_WINDOWS = [
  '08:00-10:00',
  '10:00-12:00',
  '14:00-16:00',
  '16:00-18:00',
  '18:00-20:00',
] as const;

export type DeliveryTimeWindow = typeof DELIVERY_TIME_WINDOWS[number];

export interface Order {
  id: string;
  customerId: string;
  brand: string;
  quantity: number;
  deliveryTimeWindow: DeliveryTimeWindow;
  status: OrderStatus;
  deliveryId?: string;
  deliveredBuckets: number;
  returnedBuckets: number;
  createdAt: string;
}

export type OrderFormData = Omit<Order, 'id' | 'status' | 'deliveredBuckets' | 'returnedBuckets' | 'createdAt'>;
