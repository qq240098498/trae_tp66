import { useState } from 'react';
import { Table, Button, Input, Space, Select, Card, Tag } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { formatDateTime } from '../../utils/date';
import type { Delivery, DeliveryStatus } from '../../types';

const statusColors: Record<DeliveryStatus, string> = {
  pending: 'default',
  assigned: 'blue',
  picked: 'orange',
  delivered: 'green',
  cancelled: 'red',
};

const statusLabels: Record<DeliveryStatus, string> = {
  pending: '待派单',
  assigned: '已派单',
  picked: '已取货',
  delivered: '已完成',
  cancelled: '已取消',
};

const DeliveryList = () => {
  const navigate = useNavigate();
  const { deliveries, staffs } = useDeliveryStore();
  const { getOrder } = useOrderStore();
  const { getCustomer } = useCustomerStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | 'all'>('all');

  const filteredDeliveries = deliveries.filter((delivery) => {
    const order = getOrder(delivery.orderId);
    const customer = order ? getCustomer(order.customerId) : null;
    const staff = staffs.find((s) => s.id === delivery.staffId);

    const matchesSearch =
      delivery.id.includes(searchText) ||
      customer?.name.includes(searchText) ||
      staff?.name.includes(searchText);

    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      title: '配送信息',
      key: 'info',
      render: (_, record: Delivery) => {
        const order = getOrder(record.orderId);
        const customer = order ? getCustomer(order.customerId) : null;
        return (
          <div>
            <div className="font-medium text-gray-800">
              #{record.id.slice(-6)}
            </div>
            <div className="text-sm text-gray-500">{customer?.name}</div>
          </div>
        );
      },
    },
    {
      title: '配送地址',
      key: 'address',
      render: (_, record: Delivery) => {
        const order = getOrder(record.orderId);
        const customer = order ? getCustomer(order.customerId) : null;
        return (
          <div>
            <div className="text-gray-700">{customer?.address}</div>
            <div className="text-sm text-gray-500">楼层：{customer?.floor}</div>
          </div>
        );
      },
    },
    {
      title: '配送员',
      key: 'staff',
      render: (_, record: Delivery) => {
        const staff = staffs.find((s) => s.id === record.staffId);
        return <span className="text-gray-700">{staff?.name}</span>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: DeliveryStatus) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
    },
    {
      title: '派单时间',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (date: string) => <span className="text-gray-500">{formatDateTime(date)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Delivery) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/order/${record.orderId}`)}
          >
            查看订单
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="配送管理"
        extra={
          <Button type="primary" onClick={() => navigate('/delivery/dispatch')}>
            配送派单
          </Button>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <Input
            placeholder="搜索配送单号、客户、配送员"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
            allowClear
          />
          <Select
            placeholder="配送状态"
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-36"
            allowClear
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending">待派单</Select.Option>
            <Select.Option value="assigned">已派单</Select.Option>
            <Select.Option value="picked">已取货</Select.Option>
            <Select.Option value="delivered">已完成</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
          </Select>
          <span className="text-gray-500 text-sm ml-auto">
            共 {filteredDeliveries.length} 条配送记录
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={filteredDeliveries}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default DeliveryList;
