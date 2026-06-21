import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DepositRecord,
  DepositFormData,
  BucketCirculation,
  BucketCirculationFormData,
  BucketDamage,
  BucketDamageFormData,
  BucketReconciliation,
  BucketReconciliationStatus,
  BUCKET_DEPOSIT_PRICE,
  BUCKET_DAMAGE_PRICE,
} from '../types';
import { generateId } from '../utils/id';
import { getToday, dayjs } from '../utils/date';
import { useCustomerStore } from './customerStore';
import { useDeliveryStore } from './deliveryStore';

interface BucketAssetState {
  depositRecords: DepositRecord[];
  circulations: BucketCirculation[];
  damages: BucketDamage[];
  reconciliations: BucketReconciliation[];
  initialized: boolean;
  initData: () => void;
  addDeposit: (data: DepositFormData) => void;
  getDepositsByCustomer: (customerId: string) => DepositRecord[];
  getDepositsByDate: (date: string) => DepositRecord[];
  addCirculation: (data: BucketCirculationFormData) => void;
  getCirculationsByStaff: (staffId: string, date?: string) => BucketCirculation[];
  getCirculationsByDate: (date: string) => BucketCirculation[];
  addDamage: (data: BucketDamageFormData) => void;
  getDamagesByDate: (date: string) => BucketDamage[];
  getStaffBucketBalance: (staffId: string, date?: string) => number;
  generateStaffReconciliation: (staffId: string, date?: string) => BucketReconciliation;
  resolveReconciliation: (id: string, remark: string) => void;
  getReconciliationsByDate: (date: string) => BucketReconciliation[];
  getDailySummary: (date?: string) => {
    totalTakeout: number;
    totalSign: number;
    totalReturn: number;
    totalDamage: number;
    totalDeposit: number;
    totalDepositRefund: number;
  };
}

export const useBucketAssetStore = create<BucketAssetState>()(
  persist(
    (set, get) => ({
      depositRecords: [],
      circulations: [],
      damages: [],
      reconciliations: [],
      initialized: false,

      initData: () => {
        if (!get().initialized) {
          const customers = useCustomerStore.getState().customers;
          const staffs = useDeliveryStore.getState().staffs;
          const mockDeposits: DepositRecord[] = [];
          const mockCirculations: BucketCirculation[] = [];

          customers.forEach((customer) => {
            if (customer.depositBuckets > 0) {
              mockDeposits.push({
                id: generateId(),
                customerId: customer.id,
                actionType: 'deposit',
                quantity: customer.depositBuckets,
                amount: customer.depositBuckets * BUCKET_DEPOSIT_PRICE,
                remark: '初始押桶',
                createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
              });
            }
          });

          const today = getToday();
          const brands = ['农夫山泉', '怡宝', '娃哈哈', '百岁山'];

          staffs.forEach((staff, staffIndex) => {
            const baseDate = dayjs(today);
            for (let d = 0; d < 3; d++) {
              const date = baseDate.subtract(d, 'day').format('YYYY-MM-DD');

              const takeoutCount = 8 + staffIndex * 2 - d;
              mockCirculations.push({
                id: generateId(),
                staffId: staff.id,
                type: 'takeout',
                quantity: takeoutCount,
                brand: brands[staffIndex % brands.length],
                remark: '早班带出',
                createdAt: dayjs(date).hour(8).minute(0).toISOString(),
              });

              const signCount = takeoutCount - 1;
              mockCirculations.push({
                id: generateId(),
                staffId: staff.id,
                customerId: customers[staffIndex % customers.length].id,
                type: 'sign',
                quantity: signCount,
                brand: brands[staffIndex % brands.length],
                remark: '客户签收',
                createdAt: dayjs(date).hour(14).minute(0).toISOString(),
              });

              const returnCount = signCount - 1;
              mockCirculations.push({
                id: generateId(),
                staffId: staff.id,
                customerId: customers[staffIndex % customers.length].id,
                type: 'return',
                quantity: returnCount,
                brand: brands[staffIndex % brands.length],
                remark: '回收空桶',
                createdAt: dayjs(date).hour(16).minute(0).toISOString(),
              });
            }
          });

          set({
            depositRecords: mockDeposits,
            circulations: mockCirculations,
            initialized: true,
          });
        }
      },

      addDeposit: (data) => {
        const record: DepositRecord = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };

        set({ depositRecords: [...get().depositRecords, record] });

        const delta = data.actionType === 'deposit' ? data.quantity : -data.quantity;
        useCustomerStore.getState().updateDepositBuckets(data.customerId, delta);
      },

      getDepositsByCustomer: (customerId) => {
        return get().depositRecords.filter((d) => d.customerId === customerId);
      },

      getDepositsByDate: (date) => {
        return get().depositRecords.filter((d) =>
          dayjs(d.createdAt).isSame(dayjs(date), 'day')
        );
      },

      addCirculation: (data) => {
        const circulation: BucketCirculation = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };

        set({ circulations: [...get().circulations, circulation] });
      },

      getCirculationsByStaff: (staffId, date) => {
        return get().circulations.filter((c) => {
          const staffMatch = c.staffId === staffId;
          const dateMatch = date ? dayjs(c.createdAt).isSame(dayjs(date), 'day') : true;
          return staffMatch && dateMatch;
        });
      },

      getCirculationsByDate: (date) => {
        return get().circulations.filter((c) =>
          dayjs(c.createdAt).isSame(dayjs(date), 'day')
        );
      },

      addDamage: (data) => {
        const damage: BucketDamage = {
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };

        set({ damages: [...get().damages, damage] });
      },

      getDamagesByDate: (date) => {
        return get().damages.filter((d) =>
          dayjs(d.createdAt).isSame(dayjs(date), 'day')
        );
      },

      getStaffBucketBalance: (staffId, date = getToday()) => {
        const circulations = get().getCirculationsByStaff(staffId, date);
        const takeout = circulations
          .filter((c) => c.type === 'takeout')
          .reduce((sum, c) => sum + c.quantity, 0);
        const sign = circulations
          .filter((c) => c.type === 'sign')
          .reduce((sum, c) => sum + c.quantity, 0);
        const return_ = circulations
          .filter((c) => c.type === 'return')
          .reduce((sum, c) => sum + c.quantity, 0);

        return takeout - sign - return_;
      },

      generateStaffReconciliation: (staffId, date = getToday()) => {
        const circulations = get().getCirculationsByStaff(staffId, date);
        const damages = get()
          .getDamagesByDate(date)
          .filter((d) => d.staffId === staffId);

        const takeoutCount = circulations
          .filter((c) => c.type === 'takeout')
          .reduce((sum, c) => sum + c.quantity, 0);
        const signCount = circulations
          .filter((c) => c.type === 'sign')
          .reduce((sum, c) => sum + c.quantity, 0);
        const returnCount = circulations
          .filter((c) => c.type === 'return')
          .reduce((sum, c) => sum + c.quantity, 0);
        const damageCount = damages.reduce((sum, d) => sum + d.quantity, 0);

        const difference = takeoutCount - signCount - returnCount - damageCount;

        const existing = get().reconciliations.find(
          (r) => r.staffId === staffId && r.date === date
        );

        if (existing) {
          const status: BucketReconciliationStatus =
            difference === 0
              ? 'matched'
              : existing.status === 'resolved'
                ? 'resolved'
                : 'mismatch';

          set({
            reconciliations: get().reconciliations.map((r) =>
              r.id === existing.id
                ? {
                    ...r,
                    takeoutCount,
                    signCount,
                    returnCount,
                    damageCount,
                    difference,
                    status,
                  }
                : r
            ),
          });
          return get().reconciliations.find((r) => r.id === existing.id)!;
        }

        const reconciliation: BucketReconciliation = {
          id: generateId(),
          date,
          staffId,
          takeoutCount,
          signCount,
          returnCount,
          damageCount,
          difference,
          status: difference === 0 ? 'matched' : 'mismatch',
          createdAt: new Date().toISOString(),
        };

        set({ reconciliations: [...get().reconciliations, reconciliation] });
        return reconciliation;
      },

      resolveReconciliation: (id, remark) => {
        set({
          reconciliations: get().reconciliations.map((r) =>
            r.id === id ? { ...r, status: 'resolved', remark } : r
          ),
        });
      },

      getReconciliationsByDate: (date) => {
        return get().reconciliations.filter((r) => r.date === date);
      },

      getDailySummary: (date = getToday()) => {
        const circulations = get().getCirculationsByDate(date);
        const deposits = get().getDepositsByDate(date);
        const damages = get().getDamagesByDate(date);

        return {
          totalTakeout: circulations
            .filter((c) => c.type === 'takeout')
            .reduce((sum, c) => sum + c.quantity, 0),
          totalSign: circulations
            .filter((c) => c.type === 'sign')
            .reduce((sum, c) => sum + c.quantity, 0),
          totalReturn: circulations
            .filter((c) => c.type === 'return')
            .reduce((sum, c) => sum + c.quantity, 0),
          totalDamage: damages.reduce((sum, d) => sum + d.quantity, 0),
          totalDeposit: deposits
            .filter((d) => d.actionType === 'deposit')
            .reduce((sum, d) => sum + d.amount, 0),
          totalDepositRefund: deposits
            .filter((d) => d.actionType === 'refund')
            .reduce((sum, d) => sum + d.amount, 0),
        };
      },
    }),
    { name: 'bucket-asset-storage' }
  )
);
