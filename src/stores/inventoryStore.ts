import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Inventory,
  InventoryLog,
  InventoryLogType,
  InventoryCheck,
  InventoryCheckItem,
  Reconciliation,
  InventoryBatch,
  BatchStatus,
} from '../types';
import { generateId } from '../utils/id';
import { generateMockInventories } from '../utils/mockData';
import { getToday } from '../utils/date';
import { useOrderStore } from './orderStore';
import { useBucketStore } from './bucketStore';
import { dayjs } from '../utils/date';

export const SHELF_LIFE_MONTHS = 3;
export const APPROACHING_THRESHOLD_MONTHS = 2;

export const computeBatchStatus = (batch: { productionDate: string; discountPrice?: number }): BatchStatus => {
  if (batch.discountPrice !== undefined) return 'discount';
  const monthsOld = dayjs().diff(dayjs(batch.productionDate), 'month', true);
  if (monthsOld >= SHELF_LIFE_MONTHS) return 'expired';
  if (monthsOld >= APPROACHING_THRESHOLD_MONTHS) return 'approaching';
  return 'normal';
};

export const getBatchRemainingDays = (productionDate: string): number => {
  const expiryDate = dayjs(productionDate).add(SHELF_LIFE_MONTHS, 'month');
  return expiryDate.diff(dayjs(), 'day');
};

interface InventoryState {
  inventories: Inventory[];
  logs: InventoryLog[];
  checks: InventoryCheck[];
  reconciliations: Reconciliation[];
  initialized: boolean;
  initData: () => void;
  addBatch: (brand: string, batchNo: string, productionDate: string, quantity: number) => void;
  updateInventory: (brand: string, fullDelta: number, emptyDelta: number, type: InventoryLogType, remark: string) => void;
  consumeBatchesForOrder: (brand: string, quantity: number) => { batchIds: string[]; consumed: number; discountApplied: boolean };
  setBatchDiscount: (batchId: string, discountPrice: number) => void;
  revertBatchDiscount: (batchId: string) => void;
  getApproachingBatches: () => InventoryBatch[];
  getDiscountBatches: () => InventoryBatch[];
  getExpiredBatches: () => InventoryBatch[];
  getBrandBatches: (brand: string) => InventoryBatch[];
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
          const existingInventories = get().inventories;
          let inventories = existingInventories;
          
          if (existingInventories.length === 0) {
            inventories = generateMockInventories();
          } else {
            inventories = existingInventories.map((inv) => {
              if (inv.batches && inv.batches.length > 0) {
                const cleanedBatches = inv.batches.map(({ status: _status, ...rest }: any) => rest);
                return { ...inv, batches: cleanedBatches };
              }
              const now = Date.now();
              const DAY = 24 * 60 * 60 * 1000;
              return {
                ...inv,
                batches: [
                  {
                    id: generateId(),
                    inventoryId: inv.id,
                    brand: inv.brand,
                    batchNo: `${inv.brand.slice(0, 2)}${dayjs().subtract(30, 'day').format('YYYYMMDD')}`,
                    productionDate: new Date(now - 30 * DAY).toISOString(),
                    quantity: inv.fullBuckets,
                    createdAt: inv.updatedAt,
                  },
                ],
              };
            });
          }
          
          set({ inventories, initialized: true });
          
          const today = getToday();
          if (!get().getReconciliationByDate(today)) {
            get().generateReconciliation(today);
          }
        }
      },
      addBatch: (brand, batchNo, productionDate, quantity) => {
        const inventory = get().inventories.find((i) => i.brand === brand);
        if (!inventory) return;

        const newBatch: InventoryBatch = {
          id: generateId(),
          inventoryId: inventory.id,
          brand,
          batchNo,
          productionDate,
          quantity,
          createdAt: new Date().toISOString(),
        };

        set({
          inventories: get().inventories.map((i) =>
            i.brand === brand
              ? {
                  ...i,
                  fullBuckets: i.fullBuckets + quantity,
                  batches: [...(i.batches || []), newBatch],
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        });

        get().addLog({
          inventoryId: inventory.id,
          type: 'purchase',
          quantity,
          remark: `采购入库 - 批次${batchNo}`,
        });
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
      consumeBatchesForOrder: (brand, quantity) => {
        const inventory = get().inventories.find((i) => i.brand === brand);
        if (!inventory) return { batchIds: [], consumed: 0, discountApplied: false };

        const priority = { discount: 0, approaching: 1, normal: 2, expired: 3 } as Record<BatchStatus, number>;
        const sortedBatches = [...(inventory.batches || [])]
          .filter((b) => b.quantity > 0 && computeBatchStatus(b) !== 'expired')
          .sort((a, b) => {
            const sa = computeBatchStatus(a);
            const sb = computeBatchStatus(b);
            if (priority[sa] !== priority[sb]) {
              return priority[sa] - priority[sb];
            }
            return dayjs(a.productionDate).valueOf() - dayjs(b.productionDate).valueOf();
          });

        let remaining = quantity;
        const consumedBatchIds: string[] = [];
        let discountApplied = false;

        const updatedBatches = (inventory.batches || []).map((batch) => {
          if (remaining <= 0) return batch;
          const sorted = sortedBatches.find((sb) => sb.id === batch.id);
          if (!sorted) return batch;

          const consume = Math.min(batch.quantity, remaining);
          if (consume > 0) {
            consumedBatchIds.push(batch.id);
            if (computeBatchStatus(batch) === 'discount') discountApplied = true;
            remaining -= consume;
            return { ...batch, quantity: batch.quantity - consume };
          }
          return batch;
        });

        const actualConsumed = quantity - remaining;

        set({
          inventories: get().inventories.map((i) =>
            i.brand === brand
              ? {
                  ...i,
                  fullBuckets: Math.max(0, i.fullBuckets - actualConsumed),
                  batches: updatedBatches,
                  updatedAt: new Date().toISOString(),
                }
              : i
          ),
        });

        return { batchIds: consumedBatchIds, consumed: actualConsumed, discountApplied };
      },
      setBatchDiscount: (batchId, discountPrice) => {
        set({
          inventories: get().inventories.map((inv) => ({
            ...inv,
            batches: (inv.batches || []).map((b) =>
              b.id === batchId ? { ...b, discountPrice } : b
            ),
          })),
        });
      },
      revertBatchDiscount: (batchId) => {
        set({
          inventories: get().inventories.map((inv) => ({
            ...inv,
            batches: (inv.batches || []).map((b) =>
              b.id === batchId ? { ...b, discountPrice: undefined } : b
            ),
          })),
        });
      },
      getApproachingBatches: () => {
        return get().inventories.flatMap((inv) =>
          (inv.batches || []).filter((b) => b.quantity > 0 && computeBatchStatus(b) === 'approaching')
        );
      },
      getDiscountBatches: () => {
        return get().inventories.flatMap((inv) =>
          (inv.batches || []).filter((b) => b.quantity > 0 && computeBatchStatus(b) === 'discount')
        );
      },
      getExpiredBatches: () => {
        return get().inventories.flatMap((inv) =>
          (inv.batches || []).filter((b) => b.quantity > 0 && computeBatchStatus(b) === 'expired')
        );
      },
      getBrandBatches: (brand) => {
        const inv = get().inventories.find((i) => i.brand === brand);
        return inv ? (inv.batches || []).filter((b) => b.quantity > 0) : [];
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
