import { useState, useMemo } from 'react';
import { Button, Card, List, Avatar, Tag, message, Empty, Alert, Tooltip } from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  CarOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { StatusTag } from '../../components/StatusTag';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { findNearestDeliveryStaff, calculateDistance } from '../../utils/distance';
import { formatDateTime } from '../../utils/date';
import { Order, DeliveryStaff } from '../../types';

const DeliveryDispatch = () => {
  const { updateOrderDelivery, getOrdersByStatus } = useOrderStore();
  const { getCustomer } = useCustomerStore();
  const { staffs, addDelivery } = useDeliveryStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [assigning, setAssigning] = useState(false);

  const pendingOrders = useMemo(() => {
    return getOrdersByStatus('pending');
  }, [getOrdersByStatus]);

  const availableStaffs = useMemo(() => {
    return staffs.filter((staff) => staff.status === 'idle');
  }, [staffs]);

  const getRecommendedStaff = (order: Order) => {
    const customer = getCustomer(order.customerId);
    if (!customer) return null;
    return findNearestDeliveryStaff(customer, staffs);
  };

  const getDistanceToCustomer = (staff: DeliveryStaff, order: Order) => {
    const customer = getCustomer(order.customerId);
    if (!customer) return null;
    return calculateDistance(
      customer.latitude,
      customer.longitude,
      staff.latitude,
      staff.longitude
    );
  };

  const handleAssign = async (order: Order, staff: DeliveryStaff) => {
    setAssigning(true);
    try {
      addDelivery({
        orderId: order.id,
        staffId: staff.id,
        status: 'assigned',
      });

      const delivery = useDeliveryStore.getState().getDeliveryByOrderId(order.id);
      if (delivery) {
        updateOrderDelivery(order.id, delivery.id);
        message.success(`订单已分配给 ${staff.name}`);
        setSelectedOrder(null);
      }
    } catch {
      message.error('分配失败，请重试');
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = (order: Order) => {
    const recommended = getRecommendedStaff(order);
    if (recommended) {
      handleAssign(order, recommended);
    } else {
      message.warning('暂无可用配送员，请稍后重试或手动分配');
    }
  };

  const handleBatchAutoAssign = () => {
    if (pendingOrders.length === 0) {
      message.info('暂无待派单订单');
      return;
    }

    if (availableStaffs.length === 0) {
      message.warning('暂无可用配送员');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    pendingOrders.forEach((order) => {
      const recommended = getRecommendedStaff(order);
      if (recommended) {
        addDelivery({
          orderId: order.id,
          staffId: recommended.id,
          status: 'assigned',
        });
        const delivery = useDeliveryStore.getState().getDeliveryByOrderId(order.id);
        if (delivery) {
          updateOrderDelivery(order.id, delivery.id);
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    });

    if (successCount > 0) {
      message.success(`成功自动分配 ${successCount} 单${failCount > 0 ? `，${failCount} 单分配失败` : ''}`);
    } else {
      message.warning('自动派单失败，暂无可用配送员');
    }
  };

  const renderOrderCard = (order: Order) => {
    const customer = getCustomer(order.customerId);
    const recommendedStaff = getRecommendedStaff(order);
    const isSelected = selectedOrder?.id === order.id;

    return (
      <List.Item
        key={order.id}
        onClick={() => setSelectedOrder(isSelected ? null : order)}
        className={`cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-blue-500 rounded-lg' : ''
        }`}
      >
        <Card className={`w-full hover:shadow-md transition-shadow ${isSelected ? 'border-blue-500' : ''}`}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-800">#{order.id.slice(-6)}</span>
                <StatusTag status={order.status} />
              </div>
              <div className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</div>
            </div>
            {recommendedStaff && (
              <Tooltip title={`推荐配送员: ${recommendedStaff.name}`}>
                <Tag color="cyan" icon={<ThunderboltOutlined />}>
                  智能推荐
                </Tag>
              </Tooltip>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="text-gray-700">{customer?.name}</span>
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <PhoneOutlined /> {customer?.phone}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <EnvironmentOutlined />
              <span>{customer?.address}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ClockCircleOutlined />
              <span>{order.deliveryTimeWindow}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <div>
              <span className="text-gray-700 font-medium">{order.brand}</span>
              <span className="text-gray-500 ml-2">{order.quantity} 桶</span>
            </div>
            <div className="flex gap-2">
              {recommendedStaff && (
                <Button
                  type="primary"
                  size="small"
                  icon={<ThunderboltOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAutoAssign(order);
                  }}
                  loading={assigning}
                >
                  智能派单
                </Button>
              )}
              <Button
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrder(isSelected ? null : order);
                }}
              >
                {isSelected ? '取消选择' : '手动分配'}
              </Button>
            </div>
          </div>
        </Card>
      </List.Item>
    );
  };

  const renderStaffCard = (staff: DeliveryStaff) => {
    const distance = selectedOrder ? getDistanceToCustomer(staff, selectedOrder) : null;
    const isRecommended = selectedOrder && getRecommendedStaff(selectedOrder)?.id === staff.id;

    return (
      <List.Item key={staff.id}>
        <Card
          className={`w-full hover:shadow-md transition-shadow ${
            isRecommended ? 'border-cyan-400 bg-cyan-50' : ''
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CarOutlined className="text-green-600 text-lg" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{staff.name}</span>
                {isRecommended && (
                  <Tag color="cyan" icon={<ThunderboltOutlined />}>
                    推荐
                  </Tag>
                )}
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <PhoneOutlined /> {staff.phone}
              </div>
            </div>
            <Tag color={staff.status === 'idle' ? 'success' : 'default'}>
              {staff.status === 'idle' ? '空闲' : staff.status === 'delivering' ? '配送中' : '离线'}
            </Tag>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-500">
              <span>今日配送: </span>
              <span className="font-medium text-gray-700">{staff.todayDeliveries} 单</span>
            </div>
            {distance !== null && (
              <div className="text-gray-500">
                <span>距离: </span>
                <span className={`font-medium ${distance < 2 ? 'text-green-600' : distance < 5 ? 'text-orange-500' : 'text-red-500'}`}>
                  {distance.toFixed(2)} km
                </span>
              </div>
            )}
          </div>

          {selectedOrder && staff.status === 'idle' && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Button
                type="primary"
                size="small"
                block
                icon={<CheckOutlined />}
                onClick={() => handleAssign(selectedOrder, staff)}
                loading={assigning}
                disabled={staff.status !== 'idle'}
              >
                分配给 {staff.name}
              </Button>
            </div>
          )}
        </Card>
      </List.Item>
    );
  };

  return (
    <div>
      <PageHeader
        title="派单管理"
        breadcrumbs={[{ title: '配送管理' }]}
        extra={
          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleBatchAutoAssign}
              disabled={pendingOrders.length === 0 || availableStaffs.length === 0}
            >
              一键智能派单
            </Button>
          </div>
        }
      />

      {pendingOrders.length > 0 && availableStaffs.length === 0 && (
        <Alert
          message="当前无可用配送员"
          description="所有配送员均处于忙碌或离线状态，无法进行派单"
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      <div className="grid grid-cols-2 gap-6">
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>待派单订单</span>
              <Tag color="orange">{pendingOrders.length} 单</Tag>
            </div>
          }
          className="border-0 shadow-sm"
        >
          {pendingOrders.length === 0 ? (
            <Empty description="暂无待派单订单" />
          ) : (
            <List
              dataSource={pendingOrders}
              renderItem={renderOrderCard}
              className="space-y-3"
            />
          )}
        </Card>

        <Card
          title={
            <div className="flex items-center justify-between">
              <span>配送员列表</span>
              <Tag color="green">{availableStaffs.length} 人空闲</Tag>
            </div>
          }
          className="border-0 shadow-sm"
        >
          {selectedOrder ? (
            <Alert
              message={`已选择订单 #${selectedOrder.id.slice(-6)}`}
              description="点击下方配送员卡片中的「分配」按钮完成派单"
              type="info"
              showIcon
              className="mb-4"
            />
          ) : (
            <Alert
              message="请先选择订单"
              description="点击左侧订单卡片中的「手动分配」按钮选择要分配的订单"
              type="info"
              showIcon
              className="mb-4"
            />
          )}
          {staffs.length === 0 ? (
            <Empty description="暂无配送员" />
          ) : (
            <List
              dataSource={staffs}
              renderItem={renderStaffCard}
              className="space-y-3"
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default DeliveryDispatch;
