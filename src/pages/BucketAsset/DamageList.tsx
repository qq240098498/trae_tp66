import { useState } from 'react';
import { Table, Button, DatePicker, Select, Modal, Card, Tag, Space, message, Tabs } from 'antd';
import { PlusOutlined, ArrowLeftOutlined, WarningOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useBucketAssetStore } from '../../stores/bucketAssetStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { formatDateTime, getToday } from '../../utils/date';
import { BucketDamage, BucketDamageType, BUCKET_DAMAGE_PRICE } from '../../types';
import DamageForm from './DamageForm';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const typeLabels: Record<BucketDamageType, string> = {
  damage: '损坏',
  lost: '丢失',
};

const typeColors: Record<BucketDamageType, string> = {
  damage: 'orange',
  lost: 'red',
};

const typeIcons: Record<BucketDamageType, React.ReactNode> = {
  damage: <WarningOutlined />,
  lost: <QuestionCircleOutlined />,
};

const DamageList = () => {
  const navigate = useNavigate();
  const { damages, addDamage, getDailySummary } = useBucketAssetStore();
  const { customers } = useCustomerStore();
  const { staffs } = useDeliveryStore();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [defaultType, setDefaultType] = useState<BucketDamageType>('damage');
  const [typeFilter, setTypeFilter] = useState<BucketDamageType | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const todaySummary = getDailySummary(getToday());

  const totalDamageAmount = damages.reduce((sum, d) => sum + d.amount, 0);
  const totalChargedAmount = damages.reduce((sum, d) => sum + d.chargedAmount, 0);

  const filteredDamages = damages.filter((record) => {
    let match = true;
    if (typeFilter) {
      match = match && record.type === typeFilter;
    }
    if (activeTab !== 'all') {
      match = match && record.type === activeTab;
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

  const columns = [
    {
      title: '登记时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: BucketDamageType) => (
        <Tag icon={typeIcons[type]} color={typeColors[type]}>
          {typeLabels[type]}
        </Tag>
      ),
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
      render: (qty: number) => (
        <span className="text-red-600 font-medium">{qty} 个</span>
      ),
    },
    {
      title: '赔偿单价',
      key: 'price',
      render: () => <span>¥{BUCKET_DAMAGE_PRICE}/个</span>,
    },
    {
      title: '应扣金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className="text-red-600 font-medium">¥{amount}</span>
      ),
    },
    {
      title: '责任人',
      key: 'responsible',
      render: (_: any, record: BucketDamage) => {
        if (record.chargeTo === 'staff') {
          const staff = staffs.find((s) => s.id === record.staffId);
          return (
            <span>
              <Tag color="blue">配送员</Tag>
              {staff?.name || '未知'}
            </span>
          );
        } else {
          const customer = customers.find((c) => c.id === record.customerId);
          return (
            <span>
              <Tag color="green">客户</Tag>
              {customer?.name || '未知'}
            </span>
          );
        }
      },
    },
    {
      title: '已扣金额',
      dataIndex: 'chargedAmount',
      key: 'chargedAmount',
      render: (amount: number) => (
        <span className={amount > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
          {amount > 0 ? `¥${amount}` : '未扣费'}
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
    const amount = values.quantity * BUCKET_DAMAGE_PRICE;
    addDamage({
      ...values,
      amount,
      chargedAmount: values.chargedAmount || 0,
    });
    message.success('登记成功');
    setFormModalVisible(false);
  };

  const openForm = (type: BucketDamageType) => {
    setDefaultType(type);
    setFormModalVisible(true);
  };

  return (
    <div>
      <PageHeader
        title="桶损/丢失登记"
        breadcrumbs={[{ title: '水桶资产', path: '/bucket-asset' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bucket')}>
              返回空桶回收
            </Button>
            <Space>
              <Button type="primary" icon={<WarningOutlined />} onClick={() => openForm('damage')}>
                登记损坏
              </Button>
              <Button type="primary" danger icon={<QuestionCircleOutlined />} onClick={() => openForm('lost')}>
                登记丢失
              </Button>
            </Space>
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1 flex items-center gap-1">
              <WarningOutlined /> 赔偿单价
            </div>
            <div className="text-2xl font-bold text-orange-700">¥{BUCKET_DAMAGE_PRICE}/个</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-600 mb-1 flex items-center gap-1">
              <WarningOutlined /> 今日损坏/丢失
            </div>
            <div className="text-2xl font-bold text-red-700">{todaySummary.totalDamage} 个</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-yellow-600 mb-1">累计应扣金额</div>
            <div className="text-2xl font-bold text-yellow-700">¥{totalDamageAmount}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1">累计已扣金额</div>
            <div className="text-2xl font-bold text-green-700">¥{totalChargedAmount}</div>
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
          <TabPane tab="全部" key="all" />
          <TabPane tab={<span><WarningOutlined /> 损坏</span>} key="damage" />
          <TabPane tab={<span><QuestionCircleOutlined /> 丢失</span>} key="lost" />
        </Tabs>

        <div className="mb-4 flex justify-between items-center gap-4">
          <Space className="flex-1">
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
            共 {filteredDamages.length} 条记录
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredDamages}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={`登记${typeLabels[defaultType]}`}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <DamageForm
          defaultType={defaultType}
          onSuccess={handleFormSubmit}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default DamageList;
