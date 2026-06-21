import { useState } from 'react';
import { Table, Button, DatePicker, Select, Modal, Card, Tag, Space, message } from 'antd';
import { PlusOutlined, SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useBucketAssetStore } from '../../stores/bucketAssetStore';
import { useCustomerStore } from '../../stores/customerStore';
import { formatDateTime, getToday } from '../../utils/date';
import { DepositRecord, BUCKET_DEPOSIT_PRICE } from '../../types';
import DepositForm from './DepositForm';

const { RangePicker } = DatePicker;
const { Option } = Select;

const DepositList = () => {
  const navigate = useNavigate();
  const { depositRecords, addDeposit } = useBucketAssetStore();
  const { customers } = useCustomerStore();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const filteredRecords = depositRecords.filter((record) => {
    let match = true;
    if (customerFilter) {
      match = match && record.customerId === customerFilter;
    }
    if (dateRange) {
      const recordDate = new Date(record.createdAt);
      const startDate = new Date(dateRange[0]);
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);
      match = match && recordDate >= startDate && recordDate <= endDate;
    }
    return match;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalDeposit = filteredRecords
    .filter((r) => r.actionType === 'deposit')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalRefund = filteredRecords
    .filter((r) => r.actionType === 'refund')
    .reduce((sum, r) => sum + r.amount, 0);

  const columns = [
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '客户',
      dataIndex: 'customerId',
      key: 'customerId',
      render: (customerId: string) => {
        const customer = customers.find((c) => c.id === customerId);
        return customer ? (
          <span>{customer.name} - {customer.phone}</span>
        ) : (
          <span className="text-gray-400">未知客户</span>
        );
      },
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
      render: (qty: number, record: DepositRecord) => (
        <span className={record.actionType === 'deposit' ? 'text-blue-600 font-medium' : 'text-orange-600 font-medium'}>
          {record.actionType === 'deposit' ? '+' : '-'}{qty} 个
        </span>
      ),
    },
    {
      title: '单价',
      key: 'price',
      render: () => <span>¥{BUCKET_DEPOSIT_PRICE}</span>,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: DepositRecord) => (
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

  const handleFormSubmit = (values: any) => {
    const amount = values.quantity * BUCKET_DEPOSIT_PRICE;
    addDeposit({
      customerId: values.customerId,
      actionType: values.actionType,
      quantity: values.quantity,
      amount: values.actionType === 'deposit' ? amount : amount,
      remark: values.remark,
    });
    message.success('登记成功');
    setFormModalVisible(false);
  };

  return (
    <div>
      <PageHeader
        title="押桶登记"
        breadcrumbs={[{ title: '水桶资产', path: '/bucket-asset' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bucket')}>
              返回空桶回收
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormModalVisible(true)}>
              新增登记
            </Button>
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1">押桶单价</div>
            <div className="text-2xl font-bold text-blue-700">¥{BUCKET_DEPOSIT_PRICE}/个</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1">累计押桶金额</div>
            <div className="text-2xl font-bold text-green-700">¥{totalDeposit}</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1">累计退桶金额</div>
            <div className="text-2xl font-bold text-orange-700">¥{totalRefund}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">当前押金余额</div>
            <div className="text-2xl font-bold text-purple-700">¥{totalDeposit - totalRefund}</div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex justify-between items-center gap-4">
          <Space className="flex-1">
            <Select
              placeholder="选择客户筛选"
              allowClear
              style={{ width: 250 }}
              value={customerFilter || undefined}
              onChange={(value) => setCustomerFilter(value || null)}
              showSearch
              optionFilterProp="children"
            >
              {customers.map((customer) => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </Option>
              ))}
            </Select>
            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
              }}
            />
          </Space>
          <span className="text-gray-500 text-sm">
            共 {filteredRecords.length} 条记录
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="押桶/退桶登记"
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <DepositForm
          onSuccess={handleFormSubmit}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default DepositList;
