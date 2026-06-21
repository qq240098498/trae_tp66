import { generateId } from './id';
import { Customer, DeliveryStaff, Inventory, Order, BucketReturn, Delivery } from '../types';

const baseLat = 39.9042;
const baseLon = 116.4074;

const randomOffset = () => (Math.random() - 0.5) * 0.1;

export const generateMockCustomers = (): Customer[] => [
  {
    id: generateId(),
    name: '张三',
    phone: '13800138001',
    address: '阳光小区1号楼2单元',
    floor: '501',
    preferredBrand: '农夫山泉',
    emptyBuckets: 3,
    depositBuckets: 5,
    latitude: baseLat + randomOffset(),
    longitude: baseLon + randomOffset(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '李四',
    phone: '13800138002',
    address: '幸福花园3号楼1单元',
    floor: '302',
    preferredBrand: '怡宝',
    emptyBuckets: 2,
    depositBuckets: 3,
    latitude: baseLat + randomOffset(),
    longitude: baseLon + randomOffset(),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '王五',
    phone: '13800138003',
    address: '锦绣家园5号楼3单元',
    floor: '805',
    preferredBrand: '娃哈哈',
    emptyBuckets: 5,
    depositBuckets: 8,
    latitude: baseLat + randomOffset(),
    longitude: baseLon + randomOffset(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '赵六',
    phone: '13800138004',
    address: '丽景苑2号楼1单元',
    floor: '1001',
    preferredBrand: '农夫山泉',
    emptyBuckets: 1,
    depositBuckets: 2,
    latitude: baseLat + randomOffset(),
    longitude: baseLon + randomOffset(),
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '孙七',
    phone: '13800138005',
    address: '金茂府6号楼2单元',
    floor: '1503',
    preferredBrand: '百岁山',
    emptyBuckets: 4,
    depositBuckets: 6,
    latitude: baseLat + randomOffset(),
    longitude: baseLon + randomOffset(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const generateMockDeliveryStaff = (): DeliveryStaff[] => [
  {
    id: generateId(),
    name: '李配送',
    phone: '13900139001',
    status: 'idle',
    latitude: baseLat + 0.005,
    longitude: baseLon + 0.005,
    todayDeliveries: 0,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '王师傅',
    phone: '13900139002',
    status: 'idle',
    latitude: baseLat - 0.003,
    longitude: baseLon + 0.002,
    todayDeliveries: 0,
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: generateId(),
    name: '张大哥',
    phone: '13900139003',
    status: 'delivering',
    latitude: baseLat + 0.002,
    longitude: baseLon - 0.004,
    todayDeliveries: 3,
    createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const generateMockInventories = (): Inventory[] => [
  {
    id: generateId(),
    brand: '农夫山泉',
    fullBuckets: 200,
    emptyBuckets: 150,
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    brand: '怡宝',
    fullBuckets: 180,
    emptyBuckets: 120,
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    brand: '娃哈哈',
    fullBuckets: 120,
    emptyBuckets: 80,
    updatedAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    brand: '百岁山',
    fullBuckets: 90,
    emptyBuckets: 60,
    updatedAt: new Date().toISOString(),
  },
];

export const generateMockOrders = (customers: Customer[]): Order[] => {
  const now = Date.now();
  return [
    {
      id: generateId(),
      customerId: customers[0].id,
      brand: '农夫山泉',
      quantity: 2,
      deliveryTimeWindow: '14:00-16:00',
      status: 'pending',
      deliveredBuckets: 0,
      returnedBuckets: 0,
      createdAt: new Date(now - 30 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      customerId: customers[1].id,
      brand: '怡宝',
      quantity: 3,
      deliveryTimeWindow: '16:00-18:00',
      status: 'delivering',
      deliveredBuckets: 0,
      returnedBuckets: 0,
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      customerId: customers[2].id,
      brand: '娃哈哈',
      quantity: 5,
      deliveryTimeWindow: '10:00-12:00',
      status: 'completed',
      deliveredBuckets: 5,
      returnedBuckets: 5,
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      customerId: customers[3].id,
      brand: '农夫山泉',
      quantity: 1,
      deliveryTimeWindow: '08:00-10:00',
      status: 'completed',
      deliveredBuckets: 1,
      returnedBuckets: 1,
      createdAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: generateId(),
      customerId: customers[4].id,
      brand: '百岁山',
      quantity: 4,
      deliveryTimeWindow: '18:00-20:00',
      status: 'assigned',
      deliveredBuckets: 0,
      returnedBuckets: 0,
      createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export const generateMockDeliveries = (orders: Order[], staffs: DeliveryStaff[]): Delivery[] => {
  return orders
    .filter((o) => o.status !== 'pending')
    .map((order, index) => ({
      id: generateId(),
      orderId: order.id,
      staffId: staffs[index % staffs.length].id,
      status: order.status === 'completed' ? 'delivered' : order.status === 'delivering' ? 'picked' : 'assigned',
      assignedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      pickedAt: order.status === 'delivering' || order.status === 'completed' 
        ? new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() 
        : undefined,
      deliveredAt: order.status === 'completed' 
        ? new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() 
        : undefined,
    }));
};

export const generateMockBucketReturns = (customers: Customer[], orders: Order[]): BucketReturn[] => {
  const completedOrders = orders.filter((o) => o.status === 'completed');
  return completedOrders.map((order) => ({
    id: generateId(),
    customerId: order.customerId,
    orderId: order.id,
    quantity: order.returnedBuckets,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  }));
};
