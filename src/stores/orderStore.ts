import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, OrderFormData, OrderStatus } from '../types';
import { generateId } from '../utils/id';
import { generateMockOrders } from '../utils/mockData';
import { useCustomerStore } from './customerStore';
import { useDeliveryStore } from './deliveryStore';
import { findNearestDeliveryStaff } from '../utils/distance';
import { calculatePricing } from '../utils/pricing';

interface OrderState {
  orders: Order[];
  initialized: boolean;
  initData: () => void;
  addOrder: (order: OrderFormData) => { order: Order; autoAssigned: boolean };
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateOrderDelivery: (orderId: string, deliveryId: string) => void;
  updateReturnedBuckets: (orderId: string, quantity: number) => void;
  getOrder: (id: string) => Order | undefined;
  getCustomerOrders: (customerId: string) => Order[];
  getTodayOrders: () => Order[];
  getOrdersByStatus: (status: OrderStatus) => Order[];
  initMockOrders: (orders: Order[]) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      initialized: false,
      initData: () => {
        if (!get().initialized) {
          const customers = useCustomerStore.getState().customers;
          set({ orders: generateMockOrders(customers), initialized: true });
        }
      },
      addOrder: (orderData) => {
        const customer = useCustomerStore.getState().getCustomer(orderData.customerId);
        
        const pricing = customer 
          ? calculatePricing({ customer, quantity: orderData.quantity })
          : { unitPrice: 20, floorFeeRate: 2, floorFee: 0, totalAmount: orderData.quantity * 20 };

        const newOrder: Order = {
          ...orderData,
          ...pricing,
          id: generateId(),
          status: 'pending',
          deliveredBuckets: 0,
          returnedBuckets: 0,
          createdAt: new Date().toISOString(),
          source: orderData.source || 'manual',
        };

        set({ orders: [...get().orders, newOrder] });

        const staffs = useDeliveryStore.getState().staffs;
        
        let autoAssigned = false;
        if (customer) {
          const nearestStaff = findNearestDeliveryStaff(customer, staffs);
          if (nearestStaff) {
            useDeliveryStore.getState().addDelivery({
              orderId: newOrder.id,
              staffId: nearestStaff.id,
              status: 'assigned',
            });
            const delivery = useDeliveryStore.getState().getDeliveryByOrderId(newOrder.id);
            if (delivery) {
              set({
                orders: get().orders.map((o) =>
                  o.id === newOrder.id
                    ? { ...o, status: 'assigned', deliveryId: delivery.id }
                    : o
                ),
              });
              autoAssigned = true;
            }
          }
        }

        return { order: newOrder, autoAssigned };
      },
      updateOrderStatus: (id, status) => {
        const updates: Partial<Order> = { status };
        if (status === 'delivering') {
          const order = get().getOrder(id);
          if (order) {
            updates.deliveredBuckets = order.quantity;
          }
        }
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        });
      },
      updateOrderDelivery: (orderId, deliveryId) => {
        set({
          orders: get().orders.map((o) =>
            o.id === orderId ? { ...o, deliveryId, status: 'assigned' } : o
          ),
        });
      },
      updateReturnedBuckets: (orderId, quantity) => {
        set({
          orders: get().orders.map((o) =>
            o.id === orderId ? { ...o, returnedBuckets: quantity } : o
          ),
        });
      },
      getOrder: (id) => {
        return get().orders.find((o) => o.id === id);
      },
      getCustomerOrders: (customerId) => {
        return get().orders.filter((o) => o.customerId === customerId);
      },
      getTodayOrders: () => {
        const today = new Date().toDateString();
        return get().orders.filter(
          (o) => new Date(o.createdAt).toDateString() === today
        );
      },
      getOrdersByStatus: (status) => {
        return get().orders.filter((o) => o.status === status);
      },
      initMockOrders: (orders) => {
        set({ orders });
      },
    }),
    { name: 'order-storage' }
  )
);
