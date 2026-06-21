import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BucketReturn, BucketReturnFormData } from '../types';
import { generateId } from '../utils/id';
import { generateMockBucketReturns } from '../utils/mockData';
import { useCustomerStore } from './customerStore';
import { useOrderStore } from './orderStore';

interface BucketState {
  returns: BucketReturn[];
  initialized: boolean;
  initData: () => void;
  addReturn: (returnData: BucketReturnFormData) => void;
  getReturnsByCustomer: (customerId: string) => BucketReturn[];
  getReturnsByDate: (date: string) => BucketReturn[];
  getTodayReturns: () => BucketReturn[];
  initMockReturns: (returns: BucketReturn[]) => void;
}

export const useBucketStore = create<BucketState>()(
  persist(
    (set, get) => ({
      returns: [],
      initialized: false,
      initData: () => {
        if (!get().initialized) {
          const customers = useCustomerStore.getState().customers;
          const orders = useOrderStore.getState().orders;
          set({ returns: generateMockBucketReturns(customers, orders), initialized: true });
        }
      },
      addReturn: (returnData) => {
        const newReturn: BucketReturn = {
          ...returnData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };

        set({ returns: [...get().returns, newReturn] });

        useCustomerStore.getState().updateEmptyBuckets(returnData.customerId, returnData.quantity);

        if (returnData.orderId) {
          useOrderStore.getState().updateReturnedBuckets(returnData.orderId, returnData.quantity);
          const order = useOrderStore.getState().getOrder(returnData.orderId);
          if (order && order.status !== 'completed') {
            useOrderStore.getState().updateOrderStatus(returnData.orderId, 'completed');
          }
        }
      },
      getReturnsByCustomer: (customerId) => {
        return get().returns.filter((r) => r.customerId === customerId);
      },
      getReturnsByDate: (date) => {
        return get().returns.filter(
          (r) => new Date(r.createdAt).toDateString() === new Date(date).toDateString()
        );
      },
      getTodayReturns: () => {
        const today = new Date().toDateString();
        return get().returns.filter(
          (r) => new Date(r.createdAt).toDateString() === today
        );
      },
      initMockReturns: (returns) => {
        set({ returns });
      },
    }),
    { name: 'bucket-storage' }
  )
);
