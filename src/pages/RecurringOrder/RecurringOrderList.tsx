import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Tabs, message, Popconfirm, Statistic, Row, Col, Modal, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, PlayCircleOutlined, MessageOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useCustomerStore } from '../../stores/customerStore';
import { useRecurringOrderStore } from '../../stores/recurringOrderStore';
import { formatDateTime, dayjs } from '../../utils/date';
import type { PendingOrderStatus, Customer } from '../../types';
import { DELIVERY_TIME_WINDOWS } from '../../types';
import { Form, InputNumber, Select } from 'antd';

const PENDING_STATUS_COLORS: Record<PendingOrderStatus, string> = {
  pending_sms: 'orange',
  confirmed: 'green',
  declined: 'red',
  expired: 'gray',
};

const PENDING_STATUS_LABELS: Record<PendingOrderStatus, string> = {
  pending_sms: '待确认',
  confirmed: '已确认',
  declined: '已取消',
  expired: '已超时',
};

const RecurringOrderList = () => {
  const navigate = useNavigate();
  const { customers } = useCustomerStore();
  const { 
    pendingAutoOrders, 
    getPendingOrdersByStatus, 
    checkAndGenerateOrders, 
    confirmPendingOrder, 
    declinePendingOrder,
    simulateSmsReply,
    updateCustomerSchedule,
    disableCustomerSchedule,
  } = useRecurringOrderStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form] = Form.useForm();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    checkAndGenerateOrders();
    const interval = setInterval(() => {
      checkAndGenerateOrders();
      forceUpdate((n) => n + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [checkAndGenerateOrders]);

  const recurringCustomers = customers.filter((c) => c.recurringSchedule?.enabled);
  const pendingOrders = getPendingOrdersByStatus('pending_sms');
  const confirmedOrders = getPendingOrdersByStatus('confirmed');
  const declinedOrders = getPendingOrdersByStatus('declined');

  const getCustomer = (customerId: string) => customers.find((c) => c.id === customerId);

  const handleEditSchedule = (customer: Customer) => {
    setEditingCustomer(customer);
    form.setFieldsValue({
      intervalDays: customer.recurringSchedule?.intervalDays || 3,
      quantity: customer.recurringSchedule?.quantity || 2,
      preferredTimeWindow: customer.recurringSchedule?.preferredTimeWindow || '14:00-16:00',
    });
    setEditModalVisible(true);
  };

  const handleSaveSchedule = async () => {
    try {
      const values = await form.validateFields();
      if (editingCustomer && editingCustomer.recurringSchedule) {
        updateCustomerSchedule(editingCustomer.id, {
          ...editingCustomer.recurringSchedule,
          intervalDays: values.intervalDays,
          quantity: values.quantity,
          preferredTimeWindow: values.preferredTimeWindow,
        });
        message.success('周期设置已更新');
        setEditModalVisible(false);
      }
    } catch {
      // 验证失败
    }
  };

  const handleSimulateSms = (orderId: string, confirm: boolean) => {
    simulateSmsReply(orderId, confirm);
    message.success(confirm ? '已模拟确认短信' : '已模拟取消短信');
  };

  const pendingColumns = [
    {
      title: '客户',
      dataIndex: 'customerId',
      key: 'customerId',
      render: (customerId: string) => {
        const customer = getCustomer(customerId);
        return (
          <Link to={`/customer/${customerId}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">{customer?.name.charAt(0)}</span>
            </div>
            <div>
              <div className="font-medium text-gray-800">{customer?.name}</div>
              <div className="text-xs text-gray-400">{customer?.phone}</div>
            </div>
          </Link>
        );
      },
    },
    {
      title: '订单内容',
      key: 'order',
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium">{record.brand}</div>
          <div className="text-sm text-gray-500">{record.quantity} 桶 · {record.deliveryTimeWindow}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: PendingOrderStatus) => (
        <Tag color={PENDING_STATUS_COLORS[status]}>
          {PENDING_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '短信发送时间',
      dataIndex: 'smsSentAt',
      key: 'smsSentAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '剩余时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date: string) => {
        const diff = dayjs(date).diff(dayjs(), 'minute');
        if (diff <= 0) return <span className="text-red-500">已过期</span>;
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        return (
          <span className={diff < 30 ? 'text-orange-500 font-medium' : 'text-gray-600'}>
            {hours > 0 ? `${hours}小时` : ''}{minutes}分钟
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button 
            type="primary" 
            size="small"
            icon={<CheckOutlined />}
            onClick={() => confirmPendingOrder(record.id)}
          >
            确认下单
          </Button>
          <Popconfirm
            title="确定取消本次订单？"
            onConfirm={() => declinePendingOrder(record.id, false)}
          >
            <Button size="small" danger icon={<CloseOutlined />}>
              取消
            </Button>
          </Popconfirm>
          <Popconfirm
            title="模拟客户回复"
            description="模拟客户收到短信后的回复操作"
            onConfirm={() => handleSimulateSms(record.id, true)}
            okText="确认下单"
            cancelText="取消订单"
            onCancel={() => handleSimulateSms(record.id, false)}
          >
            <Button size="small" icon={<MessageOutlined />}>
              模拟回复
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customerColumns = [
    {
      title: '客户',
      key: 'customer',
      render: (_: any, record: Customer) => (
        <Link to={`/customer/${record.id}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">{record.name.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium text-gray-800">{record.name}</div>
            <div className="text-xs text-gray-400">{record.phone}</div>
          </div>
        </Link>
      ),
    },
    {
      title: '周期设置',
      key: 'schedule',
      render: (_: any, record: Customer) => {
        const s = record.recurringSchedule;
        if (!s) return '-';
        return (
          <div>
            <div className="font-medium">每 {s.intervalDays} 天 {s.quantity} 桶</div>
            <div className="text-sm text-gray-500">{s.preferredTimeWindow} · {record.preferredBrand}</div>
          </div>
        );
      },
    },
    {
      title: '上次下单',
      dataIndex: ['recurringSchedule', 'lastOrderDate'],
      key: 'lastOrderDate',
      render: (date?: string) => date ? formatDateTime(date) : <span className="text-gray-400">未下单</span>,
    },
    {
      title: '下次下单',
      dataIndex: ['recurringSchedule', 'nextOrderDate'],
      key: 'nextOrderDate',
      render: (date: string) => {
        const nextDate = dayjs(date);
        const isToday = nextDate.isSame(dayjs(), 'day');
        const isOverdue = nextDate.isBefore(dayjs(), 'day');
        return (
          <span className={isOverdue ? 'text-red-500 font-medium' : isToday ? 'text-orange-500 font-medium' : 'text-gray-600'}>
            {nextDate.format('YYYY-MM-DD')}
            {isOverdue && ' (已过期)'}
            {isToday && ' (今天)'}
          </span>
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: Customer) => {
        const hasPending = pendingOrders.some((p) => p.customerId === record.id);
        if (hasPending) {
          return <Tag color="orange">有待确认</Tag>;
        }
        return <Tag color="green">正常</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Customer) => (
        <Space>
          <Button size="small" onClick={() => handleEditSchedule(record)}>
            编辑周期
          </Button>
          <Popconfirm
            title="确定停用周期下单？"
            onConfirm={() => disableCustomerSchedule(record.id)}
          >
            <Button size="small" danger>
              停用
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const historyColumns = [
    {
      title: '客户',
      dataIndex: 'customerId',
      key: 'customerId',
      render: (customerId: string) => {
        const customer = getCustomer(customerId);
        return (
          <Link to={`/customer/${customerId}`} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">{customer?.name.charAt(0)}</span>
            </div>
            <div>
              <div className="font-medium text-gray-800">{customer?.name}</div>
              <div className="text-xs text-gray-400">{customer?.phone}</div>
            </div>
          </Link>
        );
      },
    },
    {
      title: '订单内容',
      key: 'order',
      render: (_: any, record: any) => (
        <div>
          <div className="font-medium">{record.brand}</div>
          <div className="text-sm text-gray-500">{record.quantity} 桶 · {record.deliveryTimeWindow}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: PendingOrderStatus) => (
        <Tag color={PENDING_STATUS_COLORS[status]}>
          {PENDING_STATUS_LABELS[status]}
        </Tag>
      ),
    },
    {
      title: '处理时间',
      key: 'processedAt',
      render: (_: any, record: any) => {
        if (record.confirmedAt) return formatDateTime(record.confirmedAt);
        if (record.status === 'expired') return formatDateTime(record.expiresAt);
        return '-';
      },
    },
    {
      title: '关联订单',
      dataIndex: 'orderId',
      key: 'orderId',
      render: (orderId?: string) => 
        orderId ? <Link to={`/order/${orderId}`}>#{orderId.slice(-6)}</Link> : '-',
    },
  ];

  return (
    <div>
      <PageHeader
        title="周期订单管理"
        breadcrumbs={[{ title: '首页', path: '/' }]}
        extra={
          <Space>
            <Alert
              type="info"
              showIcon
              icon={<PhoneOutlined />}
              message="短信功能为模拟，系统会在控制台输出模拟短信内容"
              className="bg-blue-50"
            />
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={() => {
                checkAndGenerateOrders();
                message.success('已检查所有周期订单');
              }}
            >
              立即检查
            </Button>
          </Space>
        }
      />

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic 
              title="启用周期客户" 
              value={recurringCustomers.length} 
              prefix={<UserOutlined className="text-blue-500" />}
              valueStyle={{ color: '#3B82F6' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic 
              title="待确认订单" 
              value={pendingOrders.length} 
              prefix={<MessageOutlined className="text-orange-500" />}
              valueStyle={{ color: '#F59E0B' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic 
              title="已确认订单" 
              value={confirmedOrders.length} 
              prefix={<CheckOutlined className="text-green-500" />}
              valueStyle={{ color: '#10B981' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="border-0 shadow-sm">
            <Statistic 
              title="已取消订单" 
              value={declinedOrders.length} 
              prefix={<CloseOutlined className="text-red-500" />}
              valueStyle={{ color: '#EF4444' }}
            />
          </Card>
        </Col>
      </Row>

      <Card className="border-0 shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'pending',
              label: `待确认 (${pendingOrders.length})`,
              children: (
                <Table
                  columns={pendingColumns}
                  dataSource={pendingOrders}
                  rowKey="id"
                  locale={{ emptyText: '暂无待确认订单' }}
                />
              ),
            },
            {
              key: 'customers',
              label: `周期客户 (${recurringCustomers.length})`,
              children: (
                <Table
                  columns={customerColumns}
                  dataSource={recurringCustomers}
                  rowKey="id"
                  locale={{ emptyText: '暂无启用周期下单的客户' }}
                />
              ),
            },
            {
              key: 'history',
              label: '历史记录',
              children: (
                <Table
                  columns={historyColumns}
                  dataSource={[...confirmedOrders, ...declinedOrders, ...getPendingOrdersByStatus('expired')]}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  locale={{ emptyText: '暂无历史记录' }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="编辑周期设置"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleSaveSchedule}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="intervalDays"
            label="间隔天数"
            rules={[{ required: true, message: '请输入间隔天数' }]}
          >
            <InputNumber min={1} max={30} className="w-full" addonAfter="天" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="每次数量"
            rules={[{ required: true, message: '请输入每次数量' }]}
          >
            <InputNumber min={1} max={20} className="w-full" addonAfter="桶" />
          </Form.Item>
          <Form.Item
            name="preferredTimeWindow"
            label="配送时段"
            rules={[{ required: true, message: '请选择配送时段' }]}
          >
            <Select placeholder="请选择时段">
              {DELIVERY_TIME_WINDOWS.map((tw) => (
                <Select.Option key={tw} value={tw}>
                  {tw}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RecurringOrderList;
