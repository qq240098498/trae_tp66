import { useState } from 'react';
import { Table, Button, Input, Space, Select, Card, DatePicker } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusTag } from '../../components/StatusTag';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { formatDateTime } from '../../utils/date';
import { Order, OrderStatus, DELIVERY_TIME_WINDOWS } from '../../types';
import { dayjs } from '../../utils/date';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

const OrderList = () => {
  const navigate = useNavigate();
  const { orders } = useOrderStore();
  const { getCustomer } = useCustomerStore();
  const { staffs, getDeliveryByOrderId } = useDeliveryStore();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const filteredOrders = orders.filter((order) => {
    const customer = getCustomer(order.customerId);
    const customerName = customer?.name || '';
    const customerPhone = customer?.phone || '';

    const matchesSearch =
      order.id.includes(searchText) ||
      customerName.includes(searchText) ||
      customerPhone.includes(searchText) ||
      order.brand.includes(searchText);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    const matchesDate =
      !dateRange ||
      (dayjs(order.createdAt).isAfter(dateRange[0].startOf('day')) &&
        dayjs(order.createdAt).isBefore(dateRange[1].endOf('day')));

    return matchesSearch && matchesStatus && matchesDate;
  });

  const columns = [
    {
      title: '订单信息',
      key: 'info',
      render: (_, record: Order) => {
        const customer = getCustomer(record.customerId);
        return (
          <div>
            <div className="font-medium text-gray-800">
              #{record.id.slice(-6)} - {customer?.name}
            </div>
            <div className="text-sm text-gray-500">{customer?.phone}</div>
          </div>
        );
      },
    },
    {
      title: '配送地址',
      key: 'address',
      render: (_, record: Order) => {
        const customer = getCustomer(record.customerId);
        return (
          <div>
            <div className="text-gray-700">{customer?.address}</div>
            <div className="text-sm text-gray-500">楼层：{customer?.floor}</div>
          </div>
        );
      },
    },
    {
      title: '商品信息',
      key: 'product',
      render: (_, record: Order) => (
        <div>
          <div className="text-gray-800">{record.brand}</div>
          <div className="text-sm text-gray-500">{record.quantity} 桶</div>
        </div>
      ),
    },
    {
      title: '配送时间',
      dataIndex: 'deliveryTimeWindow',
      key: 'deliveryTimeWindow',
      render: (window: string) => (
        <span className="px-2 py-1 bg-sky-50 text-sky-600 rounded text-sm">
          {window}
        </span>
      ),
    },
    {
      title: '配送员',
      key: 'staff',
      render: (_, record: Order) => {
        const delivery = getDeliveryByOrderId(record.id);
        const staff = delivery ? staffs.find((s) => s.id === delivery.staffId) : null;
        return staff ? (
          <span className="text-gray-700">{staff.name}</span>
        ) : (
          <span className="text-gray-400">未分配</span>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrderStatus) => <StatusTag status={status} />,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <span className="text-gray-500">{formatDateTime(date)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Order) => (
        <Link to={`/order/${record.id}`}>
          <Button type="link" icon={<EyeOutlined />}>
            详情
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="订单管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/order/new')}>
            新增订单
          </Button>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <Input
            placeholder="搜索订单号、客户姓名、电话、品牌"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
            allowClear
          />
          <Select
            placeholder="订单状态"
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-36"
            allowClear
          >
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="pending">待派单</Select.Option>
            <Select.Option value="assigned">已派单</Select.Option>
            <Select.Option value="delivering">配送中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="cancelled">已取消</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange as any}
            placeholder={['开始日期', '结束日期']}
          />
          <span className="text-gray-500 text-sm ml-auto">
            共 {filteredOrders.length} 条订单
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={filteredOrders}
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

export default OrderList;
