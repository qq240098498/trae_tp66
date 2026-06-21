import { useState } from 'react';
import { Table, Button, Input, Space, Modal, Popconfirm, Card } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatusTag } from '../../components/StatusTag';
import { useCustomerStore } from '../../stores/customerStore';
import { useOrderStore } from '../../stores/orderStore';
import { formatDateTime } from '../../utils/date';
import { Customer } from '../../types';
import CustomerForm from './CustomerForm';

const CustomerList = () => {
  const navigate = useNavigate();
  const { customers, deleteCustomer } = useCustomerStore();
  const { getCustomerOrders } = useOrderStore();
  const [searchText, setSearchText] = useState('');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.includes(searchText) ||
      c.phone.includes(searchText) ||
      c.address.includes(searchText)
  );

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormModalVisible(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormModalVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteCustomer(id);
  };

  const columns = [
    {
      title: '客户信息',
      key: 'info',
      render: (_, record: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold">{record.name.charAt(0)}</span>
          </div>
          <div>
            <div className="font-medium text-gray-800">{record.name}</div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <PhoneOutlined /> {record.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '地址',
      key: 'address',
      render: (_, record: Customer) => (
        <div>
          <div className="flex items-center gap-1 text-gray-700">
            <EnvironmentOutlined className="text-gray-400" />
            {record.address}
          </div>
          <div className="text-sm text-gray-500">楼层：{record.floor}</div>
        </div>
      ),
    },
    {
      title: '常订品牌',
      dataIndex: 'preferredBrand',
      key: 'preferredBrand',
      render: (brand: string) => (
        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-sm">
          {brand}
        </span>
      ),
    },
    {
      title: '空桶数',
      dataIndex: 'emptyBuckets',
      key: 'emptyBuckets',
      render: (count: number) => (
        <span className={count > 3 ? 'text-orange-500 font-medium' : 'text-gray-600'}>
          {count} 个
        </span>
      ),
    },
    {
      title: '历史订单',
      key: 'orders',
      render: (_, record: Customer) => (
        <span className="text-gray-600">{getCustomerOrders(record.id).length} 单</span>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <span className="text-gray-500">{formatDateTime(date)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Customer) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/customer/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该客户？"
            description="删除后相关数据将无法恢复"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="客户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增客户
          </Button>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex justify-between items-center">
          <Input
            placeholder="搜索客户姓名、电话、地址"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-md"
            allowClear
          />
          <span className="text-gray-500 text-sm">
            共 {filteredCustomers.length} 位客户
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
      <Modal
        title={editingCustomer ? '编辑客户' : '新增客户'}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <CustomerForm
          initialData={editingCustomer}
          onSuccess={() => setFormModalVisible(false)}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default CustomerList;
