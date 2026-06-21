import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PendingAutoOrder, PendingOrderStatus, RecurringLog, RecurringSchedule } from '../types';
import { generateId } from '../utils/id';
import { dayjs } from '../utils/date';
import { useCustomerStore } from './customerStore';
import { useOrderStore } from './orderStore';
import { useDeliveryStore } from './deliveryStore';
import { findNearestDeliveryStaff } from '../utils/distance';
import { message } from 'antd';

interface RecurringOrderState {
  pendingAutoOrders: PendingAutoOrder[];
  recurringLogs: RecurringLog[];
  initialized: boolean;
  initData: () => void;
  addLog: (customerId: string, type: RecurringLog['type'], description: string) => void;
  generatePendingOrders: () => void;
  checkAndGenerateOrders: () => void;
  confirmPendingOrder: (id: string) => void;
  declinePendingOrder: (id: string, skipNext?: boolean) => void;
  expirePendingOrders: () => void;
  getPendingOrdersByCustomer: (customerId: string) => PendingAutoOrder[];
  getPendingOrdersByStatus: (status: PendingOrderStatus) => PendingAutoOrder[];
  getLogsByCustomer: (customerId: string) => RecurringLog[];
  updateCustomerSchedule: (customerId: string, schedule: RecurringSchedule) => void;
  disableCustomerSchedule: (customerId: string) => void;
  simulateSmsReply: (pendingOrderId: string, confirm: boolean) => void;
}

const SMS_EXPIRE_HOURS = 2;

export const useRecurringOrderStore = create<RecurringOrderState>()(
  persist(
    (set, get) => ({
      pendingAutoOrders: [],
      recurringLogs: [],
      initialized: false,

      initData: () => {
        if (!get().initialized) {
          set({ initialized: true });
        }
      },

      addLog: (customerId, type, description) => {
        const log: RecurringLog = {
          id: generateId(),
          customerId,
          type,
          description,
          createdAt: new Date().toISOString(),
        };
        set({ recurringLogs: [...get().recurringLogs, log] });
      },

      updateCustomerSchedule: (customerId, schedule) => {
        const { updateCustomer, getCustomer } = useCustomerStore.getState();
        const customer = getCustomer(customerId);
        const existingSchedule = customer?.recurringSchedule;
        
        updateCustomer(customerId, { recurringSchedule: schedule });
        
        if (existingSchedule?.enabled && !schedule.enabled) {
          get().addLog(customerId, 'schedule_disabled', '已停用周期下单');
        } else if (!existingSchedule?.enabled && schedule.enabled) {
          get().addLog(customerId, 'schedule_created', 
            `已启用周期下单：${schedule.brand} 每${schedule.intervalDays}天${schedule.quantity}桶，下次下单：${dayjs(schedule.nextOrderDate).format('YYYY-MM-DD')}`);
        } else if (existingSchedule?.enabled && schedule.enabled) {
          get().addLog(customerId, 'schedule_updated', 
            `已更新周期下单：${schedule.brand} 每${schedule.intervalDays}天${schedule.quantity}桶，下次下单：${dayjs(schedule.nextOrderDate).format('YYYY-MM-DD')}`);
        }
      },

      disableCustomerSchedule: (customerId) => {
        const { updateCustomer, getCustomer } = useCustomerStore.getState();
        const customer = getCustomer(customerId);
        if (customer?.recurringSchedule) {
          updateCustomer(customerId, { 
            recurringSchedule: { ...customer.recurringSchedule, enabled: false } 
          });
          get().addLog(customerId, 'schedule_disabled', '已停用周期下单');
        }
      },

      generatePendingOrders: () => {
        const { customers } = useCustomerStore.getState();
        const now = dayjs();
        const newPendingOrders: PendingAutoOrder[] = [];

        customers.forEach((customer) => {
          if (!customer.recurringSchedule?.enabled) return;

          const schedule = customer.recurringSchedule;
          const nextOrderDate = dayjs(schedule.nextOrderDate);

          if (nextOrderDate.isBefore(now, 'day') || nextOrderDate.isSame(now, 'day')) {
            const existingPending = get().pendingAutoOrders.find(
              (p) => p.customerId === customer.id && p.status === 'pending_sms'
            );

            if (existingPending) return;

            const pendingOrder: PendingAutoOrder = {
              id: generateId(),
              customerId: customer.id,
              brand: schedule.brand,
              quantity: schedule.quantity,
              deliveryTimeWindow: schedule.preferredTimeWindow,
              status: 'pending_sms',
              smsSentAt: now.toISOString(),
              expiresAt: now.add(SMS_EXPIRE_HOURS, 'hour').toISOString(),
              createdAt: now.toISOString(),
            };

            newPendingOrders.push(pendingOrder);
            get().addLog(customer.id, 'order_generated', 
              `系统已生成待确认订单：${schedule.brand} ${schedule.quantity}桶`);
            get().addLog(customer.id, 'sms_sent', 
              `已发送确认短信至 ${customer.phone}，请在${SMS_EXPIRE_HOURS}小时内回复确认`);
            
            console.log(`📱 [模拟短信] 发送至 ${customer.phone}：【桶装水配送】您的周期订单已生成：${schedule.brand} ${schedule.quantity}桶，配送时间 ${schedule.preferredTimeWindow}。回复"确认"下单，回复"取消"跳过本次。`);
          }
        });

        if (newPendingOrders.length > 0) {
          set({ pendingAutoOrders: [...get().pendingAutoOrders, ...newPendingOrders] });
          message.info(`已生成 ${newPendingOrders.length} 个待确认订单`);
        }
      },

      checkAndGenerateOrders: () => {
        get().expirePendingOrders();
        get().generatePendingOrders();
      },

      confirmPendingOrder: (id) => {
        const pendingOrder = get().pendingAutoOrders.find((p) => p.id === id);
        if (!pendingOrder || pendingOrder.status !== 'pending_sms') return;

        const { addOrder } = useOrderStore.getState();
        const { updateCustomer, getCustomer } = useCustomerStore.getState();
        const customer = getCustomer(pendingOrder.customerId);

        const result = addOrder({
          customerId: pendingOrder.customerId,
          brand: pendingOrder.brand,
          quantity: pendingOrder.quantity,
          deliveryTimeWindow: pendingOrder.deliveryTimeWindow,
          disableFloorFee: false,
          source: 'auto',
          pendingOrderId: pendingOrder.id,
        });

        set({
          pendingAutoOrders: get().pendingAutoOrders.map((p) =>
            p.id === id
              ? { ...p, status: 'confirmed', confirmedAt: new Date().toISOString(), orderId: result.order.id }
              : p
          ),
        });

        get().addLog(pendingOrder.customerId, 'sms_confirmed', '客户已确认，订单已创建');
        get().addLog(pendingOrder.customerId, 'order_created', 
          `订单 #${result.order.id.slice(-6)} 已创建${result.autoAssigned ? '并自动派单' : ''}`);

        if (customer?.recurringSchedule) {
          const newSchedule = {
            ...customer.recurringSchedule,
            lastOrderDate: new Date().toISOString(),
            nextOrderDate: dayjs().add(customer.recurringSchedule.intervalDays, 'day').toISOString(),
          };
          updateCustomer(pendingOrder.customerId, { recurringSchedule: newSchedule });
        }

        message.success('订单已确认并创建');
      },

      declinePendingOrder: (id, skipNext = false) => {
        const pendingOrder = get().pendingAutoOrders.find((p) => p.id === id);
        if (!pendingOrder || pendingOrder.status !== 'pending_sms') return;

        set({
          pendingAutoOrders: get().pendingAutoOrders.map((p) =>
            p.id === id ? { ...p, status: 'declined' } : p
          ),
        });

        get().addLog(pendingOrder.customerId, 'sms_declined', '客户已取消本次订单');

        if (skipNext) {
          const { updateCustomer, getCustomer } = useCustomerStore.getState();
          const customer = getCustomer(pendingOrder.customerId);
          if (customer?.recurringSchedule) {
            const newSchedule = {
              ...customer.recurringSchedule,
              nextOrderDate: dayjs().add(customer.recurringSchedule.intervalDays * 2, 'day').toISOString(),
            };
            updateCustomer(pendingOrder.customerId, { recurringSchedule: newSchedule });
            get().addLog(pendingOrder.customerId, 'schedule_updated', 
              `已跳过本次，下次下单时间延后至 ${dayjs(newSchedule.nextOrderDate).format('YYYY-MM-DD')}`);
          }
        }

        message.info('已取消本次订单');
      },

      expirePendingOrders: () => {
        const now = dayjs();
        const expiredOrders = get().pendingAutoOrders.filter(
          (p) => p.status === 'pending_sms' && dayjs(p.expiresAt).isBefore(now)
        );

        if (expiredOrders.length > 0) {
          set({
            pendingAutoOrders: get().pendingAutoOrders.map((p) =>
              p.status === 'pending_sms' && dayjs(p.expiresAt).isBefore(now)
                ? { ...p, status: 'expired' }
                : p
            ),
          });

          expiredOrders.forEach((order) => {
            get().addLog(order.customerId, 'order_expired', '短信确认超时，订单已取消');
          });
        }
      },

      getPendingOrdersByCustomer: (customerId) => {
        return get().pendingAutoOrders.filter((p) => p.customerId === customerId);
      },

      getPendingOrdersByStatus: (status) => {
        return get().pendingAutoOrders.filter((p) => p.status === status);
      },

      getLogsByCustomer: (customerId) => {
        return get().recurringLogs.filter((l) => l.customerId === customerId).reverse();
      },

      simulateSmsReply: (pendingOrderId, confirm) => {
        if (confirm) {
          get().confirmPendingOrder(pendingOrderId);
        } else {
          get().declinePendingOrder(pendingOrderId, false);
        }
      },
    }),
    { name: 'recurring-order-storage' }
  )
);
