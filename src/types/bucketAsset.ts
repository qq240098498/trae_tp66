export type DepositActionType = 'deposit' | 'refund';

export interface DepositRecord {
  id: string;
  customerId: string;
  actionType: DepositActionType;
  quantity: number;
  amount: number;
  remark?: string;
  createdAt: string;
}

export type DepositFormData = Omit<DepositRecord, 'id' | 'createdAt'>;

export type BucketCirculationType = 'takeout' | 'sign' | 'return';

export interface BucketCirculation {
  id: string;
  staffId: string;
  customerId?: string;
  orderId?: string;
  type: BucketCirculationType;
  quantity: number;
  brand: string;
  remark?: string;
  createdAt: string;
}

export type BucketCirculationFormData = Omit<BucketCirculation, 'id' | 'createdAt'>;

export type BucketDamageType = 'damage' | 'lost';

export interface BucketDamage {
  id: string;
  staffId?: string;
  customerId?: string;
  type: BucketDamageType;
  quantity: number;
  brand: string;
  amount: number;
  chargeTo: 'staff' | 'customer';
  chargedAmount: number;
  remark?: string;
  createdAt: string;
}

export type BucketDamageFormData = Omit<BucketDamage, 'id' | 'createdAt'>;

export type BucketReconciliationStatus = 'matched' | 'mismatch' | 'resolved';

export interface BucketReconciliation {
  id: string;
  date: string;
  staffId: string;
  takeoutCount: number;
  signCount: number;
  returnCount: number;
  damageCount: number;
  difference: number;
  status: BucketReconciliationStatus;
  remark?: string;
  createdAt: string;
}

export interface DailyBucketSummary {
  date: string;
  totalTakeout: number;
  totalSign: number;
  totalReturn: number;
  totalDamage: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
}

export const BUCKET_DEPOSIT_PRICE = 30;
export const BUCKET_DAMAGE_PRICE = 50;
