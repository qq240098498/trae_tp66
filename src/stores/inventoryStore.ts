import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Inventory,
  InventoryLog,
  InventoryLogType,
  InventoryCheck,
  InventoryCheckItem,
  Reconciliation,
} from '../types';
import { generateId } from '../utils/id';
import { generateMockInventories } from '../utils/mockData';
import { getToday } from '../utils/date';
import { useOrderStore } from './orderStore';
import { useBucketStore } from './bucketStore';
import { dayjs } from '../utils/date';

interface InventoryState {
  inventories: Inventory[];
  logs: InventoryLog[];
  checks: InventoryCheck[];
  reconciliations: Reconciliation[];
  initialized: boolean;
  initData: () => void;
  updateInventory: (brand: string, fullDelta: number, emptyDelta: number, type: InventoryLogType, remark: string) => void;
  addLog: (log: Omit<InventoryLog, 'id' | 'createdAt'>) => void;
  createCheck: () => InventoryCheck;
  updateCheckItem: (checkId: string, inventoryId: string, actualFull: number, actualEmpty: number) => void;
  completeCheck: (checkId: string) => void;
  generateReconciliation: (date?: string) => Reconciliation;
  resolveReconciliation: (id: string, remark: string) => void;
  getInventoryByBrand: (brand: string) => Inventory | undefined;
  getReconciliationByDate: (date: string) => Reconciliation | undefined;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventories: [],
      logs: [],
      checks: [],
      reconciliations: [],
      initialized: false,
      initData: () => {
        if (!get().initialized) {
          set({ inventories: generateMockInventories(), initialized: true });
          
          const today = getToday();
          if (!get().getReconciliationByDate(today)) {
            get().generateReconciliation(today);
          }
        }
      },
      updateInventory: (brand, fullDelta, emptyDelta, type, remark) => {
        const inventory = get().inventories.find((i) => i.brand === brand);
        if (!inventory) return;

        set({
          inventories: get().inventories.map((i) =>
            i.brand === brand
              ? {
                  ...i,
                  fullBuckets: Math.max(0, i.fullBuckets + fullDelta),
                  emptyBuckets: Math.max(0, i.emptyBuckets + emptyDelta),
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        });

        if (fullDelta !== 0) {
          get().addLog({
            inventoryId: inventory.id,
            type,
            quantity: fullDelta,
            remark: `${remark} - 满桶`,
          });
        }
        if (emptyDelta !== 0) {
          get().addLog({
            inventoryId: inventory.id,
            type,
            quantity: emptyDelta,
            remark: `${remark} - 空桶`,
          });
        }
      },
      addLog: (log) => {
        const newLog: InventoryLog = {
          ...log,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set({ logs: [...get().logs, newLog] });
      },
      createCheck: () => {
        const items: InventoryCheckItem[] = get().inventories.map((i) => ({
          inventoryId: i.id,
          brand: i.brand,
          systemFullBuckets: i.fullBuckets,
          systemEmptyBuckets: i.emptyBuckets,
          actualFullBuckets: i.fullBuckets,
          actualEmptyBuckets: i.emptyBuckets,
        }));

        const newCheck: InventoryCheck = {
          id: generateId(),
          date: getToday(),
          items,
          status: 'draft',
          createdAt: new Date().toISOString(),
        };

        set({ checks: [...get().checks, newCheck] });
        return newCheck;
      },
      updateCheckItem: (checkId, inventoryId, actualFull, actualEmpty) => {
        set({
          checks: get().checks.map((c) =>
            c.id === checkId
              ? {
                  ...c,
                  items: c.items.map((item) =>
                    item.inventoryId === inventoryId
                      ? { ...item, actualFullBuckets: actualFull, actualEmptyBuckets: actualEmpty }
                      : item
                  ),
                }
              : c
          ),
        });
      },
      completeCheck: (checkId) => {
        const check = get().checks.find((c) => c.id === checkId);
        if (!check) return;

        check.items.forEach((item) => {
          const fullDiff = item.actualFullBuckets - item.systemFullBuckets;
          const emptyDiff = item.actualEmptyBuckets - item.systemEmptyBuckets;
          if (fullDiff !== 0 || emptyDiff !== 0) {
            get().updateInventory(
              item.brand,
              fullDiff,
              emptyDiff,
              'adjust',
              `盘点调整 - ${check.date}`
            );
          }
        });

        set({
          checks: get().checks.map((c) =>
            c.id === checkId ? { ...c, status: 'completed' } : c
          ),
        });
      },
      generateReconciliation: (date = getToday()) => {
        const orders = useOrderStore.getState().orders.filter((o) => 
          dayjs(o.createdAt).isSame(dayjs(date), 'day') &&
          (o.status === 'delivering' || o.status === 'completed')
        );
        const returns = useBucketStore.getState().returns.filter((r) =>
          dayjs(r.createdAt).isSame(dayjs(date), 'day')
        );

        const totalDelivered = orders.reduce((sum, o) => sum + o.deliveredBuckets, 0);
        const totalReturned = returns.reduce((sum, r) => sum + r.quantity, 0);
        const difference = totalDelivered - totalReturned;

        const existing = get().getReconciliationByDate(date);
        if (existing) {
          set({
            reconciliations: get().reconciliations.map((r) =>
              r.id === existing.id
                ? {
                    ...r,
                    totalDelivered,
                    totalReturned,
                    difference,
                    status: difference === 0 ? 'matched' : r.status === 'resolved' ? 'resolved' : 'mismatch',
                  }
                : r
            ),
          });
          return get().getReconciliationByDate(date)!;
        }

        const reconciliation: Reconciliation = {
          id: generateId(),
          date,
          totalDelivered,
          totalReturned,
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
      getInventoryByBrand: (brand) => {
        return get().inventories.find((i) => i.brand === brand);
      },
      getReconciliationByDate: (date) => {
        return get().reconciliations.find((r) => r.date === date);
      },
    }),
    { name: 'inventory-storage' }
  )
);
