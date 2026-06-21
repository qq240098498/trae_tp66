export type InventoryLogType = 'purchase' | 'sale' | 'return' | 'scrap' | 'adjust';

export type BatchStatus = 'normal' | 'approaching' | 'discount' | 'expired';

export interface InventoryBatch {
  id: string;
  inventoryId: string;
  brand: string;
  batchNo: string;
  productionDate: string;
  quantity: number;
  discountPrice?: number;
  createdAt: string;
}

export interface Inventory {
  id: string;
  brand: string;
  fullBuckets: number;
  emptyBuckets: number;
  updatedAt: string;
  batches: InventoryBatch[];
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
