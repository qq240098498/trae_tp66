import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order, OrderFormData, OrderStatus } from '../types';
import { generateId } from '../utils/id';
import { generateMockOrders } from '../utils/mockData';
import { useCustomerStore } from './customerStore';
import { useDeliveryStore } from './deliveryStore';
import { findNearestDeliveryStaff } from '../utils/distance';
import { calculatePricing } from '../utils/pricing';
import { useSystemConfigStore } from './systemConfigStore';
import { useInventoryStore, computeBatchStatus } from './inventoryStore';

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
        const config = useSystemConfigStore.getState().config;
        const disableFloorFee = orderData.disableFloorFee || false;

        const inventoryStore = useInventoryStore.getState();

        const brandBatches = inventoryStore.getBrandBatches(orderData.brand);
        const discountBatch = brandBatches.find((b) => computeBatchStatus(b) === 'discount' && b.discountPrice);
        const effectiveUnitPrice = discountBatch?.discountPrice || config.unitPrice;
        const discountApplied = !!discountBatch;

        const pricing = customer 
          ? calculatePricing({
              customer,
              quantity: orderData.quantity,
              unitPrice: effectiveUnitPrice,
              floorFeeRate: config.floorFeeRate,
              freeFloorThreshold: config.freeFloorThreshold,
              disableFloorFee,
            })
          : { unitPrice: effectiveUnitPrice, floorFeeRate: config.floorFeeRate, floorFee: 0, totalAmount: orderData.quantity * effectiveUnitPrice };

        const { batchIds, consumed } = inventoryStore.consumeBatchesForOrder(orderData.brand, orderData.quantity);

        const newOrder: Order = {
          ...orderData,
          ...pricing,
          disableFloorFee,
          id: generateId(),
          status: 'pending',
          deliveredBuckets: 0,
          returnedBuckets: 0,
          createdAt: new Date().toISOString(),
          source: orderData.source || 'manual',
          batchIds,
          discountApplied,
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
