import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Table, Tag, Empty, Modal } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { StatusTag } from '../../components/StatusTag';
import { useCustomerStore } from '../../stores/customerStore';
import { useOrderStore } from '../../stores/orderStore';
import { useBucketStore } from '../../stores/bucketStore';
import { useBucketAssetStore } from '../../stores/bucketAssetStore';
import { formatDateTime } from '../../utils/date';
import { BUCKET_DEPOSIT_PRICE } from '../../types';
import CustomerForm from './CustomerForm';
import { useState } from 'react';
import { Customer } from '../../types';

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCustomer } = useCustomerStore();
  const { getCustomerOrders } = useOrderStore();
  const { getReturnsByCustomer } = useBucketStore();
  const { getDepositsByCustomer } = useBucketAssetStore();
  const [editModalVisible, setEditModalVisible] = useState(false);

  const customer = getCustomer(id || '');
  const orders = getCustomerOrders(id || '');
  const returns = getReturnsByCustomer(id || '');
  const deposits = getDepositsByCustomer(id || '');

  if (!customer) {
    return (
      <div>
        <PageHeader
          title="客户详情"
          extra={
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customer')}>
              返回列表
            </Button>
          }
        />
        <Empty description="客户不存在" />
      </div>
    );
  }

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <span className="text-gray-500">#{id.slice(-6)}</span>,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number) => `${q} 桶`,
    },
    {
      title: '配送时间',
      dataIndex: 'deliveryTimeWindow',
      key: 'deliveryTimeWindow',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusTag status={status as any} />,
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <Link to={`/order/${record.id}`}>查看</Link>
      ),
    },
  ];

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

  const depositColumns = [
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '类型',
      dataIndex: 'actionType',
      key: 'actionType',
      render: (type: string) => (
        <Tag color={type === 'deposit' ? 'blue' : 'orange'}>
          {type === 'deposit' ? '押桶' : '退桶'}
        </Tag>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number, record: any) => (
        <span className={record.actionType === 'deposit' ? 'text-blue-600 font-medium' : 'text-orange-600 font-medium'}>
          {record.actionType === 'deposit' ? '+' : '-'}{q} 个
        </span>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: any) => (
        <span className={record.actionType === 'deposit' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {record.actionType === 'deposit' ? '+' : '-'}¥{amount}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark?: string) => remark || '-',
    },
  ];

  return (
    <div>
      <PageHeader
        title="客户详情"
        breadcrumbs={[{ title: '客户管理', path: '/customer' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customer')}>
              返回列表
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditModalVisible(true)}>
              编辑信息
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/order/new?customerId=${customer.id}`)}>
              快速开单
            </Button>
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-3xl text-blue-600 font-bold">{customer.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{customer.name}</h2>
            <Descriptions column={3} size="small">
              <Descriptions.Item label="联系电话">{customer.phone}</Descriptions.Item>
              <Descriptions.Item label="详细地址">{customer.address}</Descriptions.Item>
              <Descriptions.Item label="楼层/门牌">{customer.floor}</Descriptions.Item>
              <Descriptions.Item label="常订品牌">
                <Tag color="blue">{customer.preferredBrand}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前空桶数">
                <span className={customer.emptyBuckets > 3 ? 'text-orange-500 font-medium' : 'text-gray-600'}>
                  {customer.emptyBuckets} 个
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="押桶数">
                <span className="text-blue-600 font-medium">
                  {customer.depositBuckets} 个
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="押桶押金">
                <span className="text-green-600 font-medium">
                  ¥{customer.depositBuckets * BUCKET_DEPOSIT_PRICE}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {formatDateTime(customer.createdAt)}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </div>
      </Card>

      <Card
        title="历史订单"
        className="mb-6 border-0 shadow-sm"
        extra={<span className="text-gray-500">共 {orders.length} 单</span>}
      >
        <Table
          columns={orderColumns}
          dataSource={orders}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无订单记录' }}
        />
      </Card>

      <Card
        title="空桶回收记录"
        className="mb-6 border-0 shadow-sm"
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

      <Card
        title="押桶记录"
        className="border-0 shadow-sm"
        extra={<span className="text-gray-500">共 {deposits.length} 条</span>}
      >
        <Table
          columns={depositColumns}
          dataSource={deposits}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无押桶记录' }}
        />
      </Card>

      <Modal
        title="编辑客户"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <CustomerForm
          initialData={customer}
          onSuccess={() => setEditModalVisible(false)}
          onCancel={() => setEditModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default CustomerDetail;
