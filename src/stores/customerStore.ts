import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer, CustomerFormData } from '../types';
import { generateId } from '../utils/id';
import { generateMockCustomers } from '../utils/mockData';

interface CustomerState {
  customers: Customer[];
  initialized: boolean;
  initData: () => void;
  addCustomer: (customer: CustomerFormData) => void;
  updateCustomer: (id: string, customer: Partial<CustomerFormData>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  updateEmptyBuckets: (customerId: string, delta: number) => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      customers: [],
      initialized: false,
      initData: () => {
        if (!get().initialized) {
          set({ customers: generateMockCustomers(), initialized: true });
        }
      },
      addCustomer: (customer) => {
        const newCustomer: Customer = {
          ...customer,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set({ customers: [...get().customers, newCustomer] });
      },
      updateCustomer: (id, customer) => {
        set({
          customers: get().customers.map((c) =>
            c.id === id ? { ...c, ...customer } : c
          ),
        });
      },
      deleteCustomer: (id) => {
        set({
          customers: get().customers.filter((c) => c.id !== id),
        });
      },
      getCustomer: (id) => {
        return get().customers.find((c) => c.id === id);
      },
      updateEmptyBuckets: (customerId, delta) => {
        set({
          customers: get().customers.map((c) =>
            c.id === customerId
              ? { ...c, emptyBuckets: Math.max(0, c.emptyBuckets + delta) }
              : c
          ),
        });
      },
    }),
    { name: 'customer-storage' }
  )
);
