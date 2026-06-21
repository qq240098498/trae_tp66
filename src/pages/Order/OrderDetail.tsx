import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Tag, Empty, Modal, Select, message, Table } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, TruckOutlined, RollbackOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { StatusTag } from '../../components/StatusTag';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useBucketStore } from '../../stores/bucketStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { formatDateTime } from '../../utils/date';
import { Order, OrderStatus } from '../../types';
import BucketReturnForm from '../Bucket/BucketReturnForm';

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrder, updateOrderStatus } = useOrderStore();
  const { getCustomer } = useCustomerStore();
  const { staffs, deliveries, getDeliveryByOrderId, addDelivery, updateDeliveryStatus } = useDeliveryStore();
  const { getReturnsByCustomer } = useBucketStore();
  const { updateInventory } = useInventoryStore();
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const order = getOrder(id || '');
  const customer = order ? getCustomer(order.customerId) : null;
  const delivery = order ? getDeliveryByOrderId(order.id) : null;
  const deliveryStaff = delivery ? staffs.find((s) => s.id === delivery.staffId) : null;
  const returns = order ? getReturnsByCustomer(order.customerId) : [];

  if (!order || !customer) {
    return (
      <div>
        <PageHeader
          title="订单详情"
          extra={
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/order')}>
              返回列表
            </Button>
          }
        />
        <Empty description="订单不存在" />
      </div>
    );
  }

  const handleAssignStaff = () => {
    if (!selectedStaffId) {
      message.warning('请选择配送员');
      return;
    }

    addDelivery({
      orderId: order.id,
      staffId: selectedStaffId,
      status: 'assigned',
    });

    const newDelivery = getDeliveryByOrderId(order.id);
    if (newDelivery) {
      useOrderStore.getState().updateOrderDelivery(order.id, newDelivery.id);
      message.success('配送员分配成功');
      setAssignModalVisible(false);
    }
  };

  const handleStartDelivery = () => {
    if (delivery) {
      updateDeliveryStatus(delivery.id, 'picked');
      updateOrderStatus(order.id, 'delivering');
      updateInventory(order.brand, -order.quantity, 0, 'sale', `订单配送: #${order.id.slice(-6)}`);
      message.success('已开始配送');
    }
  };

  const handleCompleteDelivery = () => {
    if (delivery && order.status === 'delivering') {
      updateDeliveryStatus(delivery.id, 'delivered');
      updateOrderStatus(order.id, 'completed');
      updateInventory(order.brand, 0, order.quantity, 'return', `订单完成回收: #${order.id.slice(-6)}`);
      message.success('配送已完成');
    }
  };

  const handleCancelOrder = () => {
    Modal.confirm({
      title: '确定取消该订单？',
      content: '取消后将无法恢复',
      onOk: () => {
        updateOrderStatus(order.id, 'cancelled');
        if (delivery) {
          updateDeliveryStatus(delivery.id, 'cancelled');
        }
        message.success('订单已取消');
      },
    });
  };

  const getActionButtons = () => {
    const buttons: JSX.Element[] = [];

    if (order.status === 'pending') {
      buttons.push(
        <Button type="primary" onClick={() => setAssignModalVisible(true)}>
          分配配送员
        </Button>
      );
    }

    if (order.status === 'assigned' && delivery) {
      buttons.push(
        <Button type="primary" icon={<TruckOutlined />} onClick={handleStartDelivery}>
          开始配送
        </Button>
      );
    }

    if (order.status === 'delivering') {
      buttons.push(
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleCompleteDelivery}>
          完成配送
        </Button>
      );
      buttons.push(
        <Button icon={<RollbackOutlined />} onClick={() => setReturnModalVisible(true)}>
          登记空桶回收
        </Button>
      );
    }

    if (order.status === 'completed' && order.returnedBuckets === 0) {
      buttons.push(
        <Button icon={<RollbackOutlined />} onClick={() => setReturnModalVisible(true)}>
          补登空桶回收
        </Button>
      );
    }

    if (!['completed', 'cancelled'].includes(order.status)) {
      buttons.push(
        <Button danger onClick={handleCancelOrder}>
          取消订单
        </Button>
      );
    }

    return buttons;
  };

  const returnColumns = [
    {
      title: '回收时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '关联订单',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (orderId?: string) =>
        orderId ? (
          <Link to={`/order/${orderId}`}>#{orderId.slice(-6)}</Link>
        ) : (
          <span className="text-gray-400">无</span>
        ),
    },
    {
      title: '回收数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number) => <span className="text-green-600 font-medium">+{q} 个</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="订单详情"
        breadcrumbs={[{ title: '订单管理', path: '/order' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/order')}>
              返回列表
            </Button>
            {getActionButtons()}
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              订单 #{order.id.slice(-6)}
            </h2>
            <div className="flex items-center gap-2">
              <StatusTag status={order.status} />
              <span className="text-gray-500 text-sm">
                下单时间：{formatDateTime(order.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <Descriptions column={2} size="middle" className="mb-4">
          <Descriptions.Item label="客户姓名">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{customer.phone}</Descriptions.Item>
          <Descriptions.Item label="配送地址" span={2}>
            {customer.address} {customer.floor}
            {customer.hasElevator ? ' (有电梯)' : ' (无电梯)'}
          </Descriptions.Item>
          <Descriptions.Item label="品牌">{order.brand}</Descriptions.Item>
          <Descriptions.Item label="数量">{order.quantity} 桶</Descriptions.Item>
          <Descriptions.Item label="商品单价">¥{order.unitPrice}/桶</Descriptions.Item>
          <Descriptions.Item label="商品费用">¥{order.unitPrice * order.quantity}</Descriptions.Item>
          <Descriptions.Item label="爬楼费">
            {order.floorFee > 0 ? (
              <span className="text-orange-600 font-medium">+¥{order.floorFee}</span>
            ) : (
              <span className="text-gray-400">¥0</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="合计金额">
            <span className="text-blue-600 font-bold text-lg">¥{order.totalAmount}</span>
          </Descriptions.Item>
          <Descriptions.Item label="配送时间窗口">
            <Tag color="blue">{order.deliveryTimeWindow}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="配送员">
            {deliveryStaff ? (
              <span>
                {deliveryStaff.name} ({deliveryStaff.phone})
              </span>
            ) : (
              <span className="text-gray-400">未分配</span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="送出桶数">
            <span className="text-blue-600 font-medium">{order.deliveredBuckets} 桶</span>
          </Descriptions.Item>
          <Descriptions.Item label="回收桶数">
            <span className="text-green-600 font-medium">{order.returnedBuckets} 桶</span>
          </Descriptions.Item>
        </Descriptions>

        {delivery && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-800 mb-3">配送进度</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">已派单：{formatDateTime(delivery.assignedAt)}</span>
              </div>
              {delivery.pickedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-sm">已取货：{formatDateTime(delivery.pickedAt)}</span>
                </div>
              )}
              {delivery.deliveredAt && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">已送达：{formatDateTime(delivery.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card
        title="客户空桶回收记录"
        className="border-0 shadow-sm"
        extra={<span className="text-gray-500">共 {returns.length} 条</span>}
      >
        <Table
          columns={returnColumns}
          dataSource={returns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无回收记录' }}
        />
      </Card>

      <Modal
        title="分配配送员"
        open={assignModalVisible}
        onCancel={() => setAssignModalVisible(false)}
        onOk={handleAssignStaff}
        okText="确认分配"
        cancelText="取消"
      >
        <Select
          placeholder="请选择配送员"
          className="w-full"
          value={selectedStaffId}
          onChange={setSelectedStaffId}
          options={staffs
            .filter((s) => s.status === 'idle')
            .map((s) => ({
              value: s.id,
              label: `${s.name} - ${s.phone} (今日: ${s.todayDeliveries}单)`,
            }))}
        />
      </Modal>

      <Modal
        title="登记空桶回收"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        <BucketReturnForm
          initialCustomerId={order.customerId}
          initialOrderId={order.id}
          maxQuantity={order.quantity}
          onSuccess={() => setReturnModalVisible(false)}
          onCancel={() => setReturnModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default OrderDetail;
