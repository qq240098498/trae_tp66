import { Tag } from 'antd';
import { OrderStatus, DeliveryStatus, DeliveryStaffStatus, ReconciliationStatus } from '../types';

interface StatusTagProps {
  status: OrderStatus | DeliveryStatus | DeliveryStaffStatus | ReconciliationStatus;
  type?: 'order' | 'delivery' | 'staff' | 'reconciliation';
}

export const StatusTag = ({ status, type = 'order' }: StatusTagProps) => {
  const colors: Record<string, string> = {
    pending: 'orange',
    assigned: 'blue',
    delivering: 'cyan',
    picked: 'geekblue',
    completed: 'green',
    cancelled: 'default',
    idle: 'green',
    offline: 'default',
    matched: 'green',
    mismatch: 'red',
    resolved: 'purple',
  };

  const labels: Record<string, string> = {
    pending: '待派单',
    assigned: '已派单',
    delivering: '配送中',
    picked: '已取货',
    completed: '已完成',
    cancelled: '已取消',
    idle: '空闲',
    offline: '离线',
    matched: '对账一致',
    mismatch: '对账异常',
    resolved: '已处理',
  };

  return <Tag color={colors[status]}>{labels[status] || status}</Tag>;
};
