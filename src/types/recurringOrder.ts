import type { DeliveryTimeWindow } from './order';

export interface RecurringSchedule {
  enabled: boolean;
  intervalDays: number;
  quantity: number;
  brand: string;
  preferredTimeWindow: DeliveryTimeWindow;
  lastOrderDate?: string;
  nextOrderDate: string;
}

export type PendingOrderStatus = 'pending_sms' | 'confirmed' | 'declined' | 'expired';

export interface PendingAutoOrder {
  id: string;
  customerId: string;
  brand: string;
  quantity: number;
  deliveryTimeWindow: DeliveryTimeWindow;
  status: PendingOrderStatus;
  smsSentAt: string;
  expiresAt: string;
  confirmedAt?: string;
  orderId?: string;
  createdAt: string;
}

export interface RecurringLog {
  id: string;
  customerId: string;
  type: 'schedule_created' | 'schedule_updated' | 'order_generated' | 'sms_sent' | 'sms_confirmed' | 'sms_declined' | 'order_expired' | 'order_created' | 'schedule_disabled';
  description: string;
  createdAt: string;
}
