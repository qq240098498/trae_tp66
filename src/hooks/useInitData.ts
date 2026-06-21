import { useEffect } from 'react';
import { useCustomerStore } from '../stores/customerStore';
import { useOrderStore } from '../stores/orderStore';
import { useDeliveryStore } from '../stores/deliveryStore';
import { useBucketStore } from '../stores/bucketStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { generateMockDeliveries, generateMockBucketReturns } from '../utils/mockData';

export const useInitData = () => {
  const customerInit = useCustomerStore((state) => state.initData);
  const orderInit = useOrderStore((state) => state.initData);
  const deliveryInit = useDeliveryStore((state) => state.initData);
  const bucketInit = useBucketStore((state) => state.initData);
  const inventoryInit = useInventoryStore((state) => state.initData);

  useEffect(() => {
    customerInit();
    orderInit();
    deliveryInit();
    bucketInit();
    inventoryInit();

    const customers = useCustomerStore.getState().customers;
    const orders = useOrderStore.getState().orders;
    const staffs = useDeliveryStore.getState().staffs;

    if (useDeliveryStore.getState().deliveries.length === 0 && orders.length > 0) {
      const deliveries = generateMockDeliveries(orders, staffs);
      useDeliveryStore.getState().initMockDeliveries(deliveries);
    }

    if (useBucketStore.getState().returns.length === 0 && orders.length > 0) {
      const returns = generateMockBucketReturns(customers, orders);
      useBucketStore.getState().initMockReturns(returns);
    }
  }, [customerInit, orderInit, deliveryInit, bucketInit, inventoryInit]);
};
