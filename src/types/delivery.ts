export type DeliveryStaffStatus = 'idle' | 'delivering' | 'offline';

export interface DeliveryStaff {
  id: string;
  name: string;
  phone: string;
  status: DeliveryStaffStatus;
  latitude: number;
  longitude: number;
  todayDeliveries: number;
  createdAt: string;
}

export type DeliveryStatus = 'pending' | 'assigned' | 'picked' | 'delivered' | 'cancelled';

export interface Delivery {
  id: string;
  orderId: string;
  staffId: string;
  status: DeliveryStatus;
  assignedAt: string;
  pickedAt?: string;
  deliveredAt?: string;
}

export type DeliveryStaffFormData = Omit<DeliveryStaff, 'id' | 'createdAt' | 'todayDeliveries'>;
