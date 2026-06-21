export type InventoryLogType = 'purchase' | 'sale' | 'return' | 'scrap' | 'adjust';

export interface Inventory {
  id: string;
  brand: string;
  fullBuckets: number;
  emptyBuckets: number;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  inventoryId: string;
  type: InventoryLogType;
  quantity: number;
  remark: string;
  createdAt: string;
}

export interface InventoryCheck {
  id: string;
  date: string;
  items: InventoryCheckItem[];
  status: 'draft' | 'completed';
  createdAt: string;
}

export interface InventoryCheckItem {
  inventoryId: string;
  brand: string;
  systemFullBuckets: number;
  systemEmptyBuckets: number;
  actualFullBuckets: number;
  actualEmptyBuckets: number;
}

export type ReconciliationStatus = 'matched' | 'mismatch' | 'resolved';

export interface Reconciliation {
  id: string;
  date: string;
  totalDelivered: number;
  totalReturned: number;
  difference: number;
  status: ReconciliationStatus;
  remark?: string;
  createdAt: string;
}
