import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DeliveryStaff, Delivery, DeliveryStaffFormData, DeliveryStatus } from '../types';
import { generateId } from '../utils/id';
import { generateMockDeliveryStaff } from '../utils/mockData';

interface DeliveryState {
  staffs: DeliveryStaff[];
  deliveries: Delivery[];
  initialized: boolean;
  initData: () => void;
  addStaff: (staff: DeliveryStaffFormData) => void;
  updateStaff: (id: string, staff: Partial<DeliveryStaffFormData>) => void;
  updateStaffStatus: (id: string, status: DeliveryStaff['status']) => void;
  deleteStaff: (id: string) => void;
  addDelivery: (delivery: Omit<Delivery, 'id' | 'assignedAt'>) => void;
  updateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  getDeliveryByOrderId: (orderId: string) => Delivery | undefined;
  getStaffDeliveries: (staffId: string) => Delivery[];
  initMockDeliveries: (deliveries: Delivery[]) => void;
}

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set, get) => ({
      staffs: [],
      deliveries: [],
      initialized: false,
      initData: () => {
        if (!get().initialized) {
          set({ staffs: generateMockDeliveryStaff(), initialized: true });
        }
      },
      addStaff: (staff) => {
        const newStaff: DeliveryStaff = {
          ...staff,
          id: generateId(),
          todayDeliveries: 0,
          createdAt: new Date().toISOString(),
        };
        set({ staffs: [...get().staffs, newStaff] });
      },
      updateStaff: (id, staff) => {
        set({
          staffs: get().staffs.map((s) =>
            s.id === id ? { ...s, ...staff } : s
          ),
        });
      },
      updateStaffStatus: (id, status) => {
        set({
          staffs: get().staffs.map((s) =>
            s.id === id ? { ...s, status } : s
          ),
        });
      },
      deleteStaff: (id) => {
        set({
          staffs: get().staffs.filter((s) => s.id !== id),
        });
      },
      addDelivery: (delivery) => {
        const newDelivery: Delivery = {
          ...delivery,
          id: generateId(),
          assignedAt: new Date().toISOString(),
        };
        set({ deliveries: [...get().deliveries, newDelivery] });
        
        if (delivery.status === 'assigned' || delivery.status === 'picked') {
          set({
            staffs: get().staffs.map((s) =>
              s.id === delivery.staffId
                ? { ...s, status: 'delivering' as const }
                : s
            ),
          });
        }
      },
      updateDeliveryStatus: (id, status) => {
        const delivery = get().deliveries.find((d) => d.id === id);
        if (!delivery) return;

        const updates: Partial<Delivery> = { status };
        if (status === 'picked') {
          updates.pickedAt = new Date().toISOString();
        } else if (status === 'delivered') {
          updates.deliveredAt = new Date().toISOString();
          set({
            staffs: get().staffs.map((s) =>
              s.id === delivery.staffId
                ? { ...s, status: 'idle' as const, todayDeliveries: s.todayDeliveries + 1 }
                : s
            ),
          });
        } else if (status === 'cancelled') {
          set({
            staffs: get().staffs.map((s) =>
              s.id === delivery.staffId ? { ...s, status: 'idle' as const } : s
            ),
          });
        }

        set({
          deliveries: get().deliveries.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        });
      },
      getDeliveryByOrderId: (orderId) => {
        return get().deliveries.find((d) => d.orderId === orderId);
      },
      getStaffDeliveries: (staffId) => {
        return get().deliveries.filter((d) => d.staffId === staffId);
      },
      initMockDeliveries: (deliveries) => {
        set({ deliveries });
      },
    }),
    { name: 'delivery-storage' }
  )
);
