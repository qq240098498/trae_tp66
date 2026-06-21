import { useState } from 'react';
import { Table, Button, DatePicker, Select, Modal, Card, Tag, Space, message, Tabs } from 'antd';
import { PlusOutlined, ArrowLeftOutlined, TruckOutlined, CheckCircleOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useBucketAssetStore } from '../../stores/bucketAssetStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { formatDateTime, getToday } from '../../utils/date';
import { BucketCirculation, BucketCirculationType } from '../../types';
import CirculationForm from './CirculationForm';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const typeLabels: Record<BucketCirculationType, string> = {
  takeout: '带出',
  sign: '签收',
  return: '回收',
};

const typeColors: Record<BucketCirculationType, string> = {
  takeout: 'blue',
  sign: 'green',
  return: 'orange',
};

const typeIcons: Record<BucketCirculationType, React.ReactNode> = {
  takeout: <TruckOutlined />,
  sign: <CheckCircleOutlined />,
  return: <RollbackOutlined />,
};

const CirculationList = () => {
  const navigate = useNavigate();
  const { circulations, addCirculation, getDailySummary } = useBucketAssetStore();
  const { customers } = useCustomerStore();
  const { staffs } = useDeliveryStore();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [defaultType, setDefaultType] = useState<BucketCirculationType>('takeout');
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<BucketCirculationType | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const todaySummary = getDailySummary(getToday());

  const filteredCirculations = circulations.filter((record) => {
    let match = true;
    if (staffFilter) {
      match = match && record.staffId === staffFilter;
    }
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
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: BucketCirculationType) => (
        <Tag icon={typeIcons[type]} color={typeColors[type]}>
          {typeLabels[type]}
        </Tag>
      ),
    },
    {
      title: '配送员',
      dataIndex: 'staffId',
      key: 'staffId',
      render: (staffId: string) => {
        const staff = staffs.find((s) => s.id === staffId);
        return staff ? (
          <span>{staff.name}</span>
        ) : (
          <span className="text-gray-400">未知配送员</span>
        );
      },
    },
    {
      title: '客户',
      dataIndex: 'customerId',
      key: 'customerId',
      render: (customerId?: string) => {
        if (!customerId) return <span className="text-gray-400">-</span>;
        const customer = customers.find((c) => c.id === customerId);
        return customer ? (
          <span>{customer.name}</span>
        ) : (
          <span className="text-gray-400">未知客户</span>
        );
      },
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
      render: (qty: number, record: BucketCirculation) => (
        <span className={`font-medium ${
          record.type === 'takeout' ? 'text-blue-600' :
          record.type === 'sign' ? 'text-green-600' : 'text-orange-600'
        }`}>
          {record.type === 'takeout' ? '+' : record.type === 'return' ? '-' : ''}{qty} 个
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
    addCirculation(values);
    message.success('登记成功');
    setFormModalVisible(false);
  };

  const openForm = (type: BucketCirculationType) => {
    setDefaultType(type);
    setFormModalVisible(true);
  };

  return (
    <div>
      <PageHeader
        title="桶流转管理"
        breadcrumbs={[{ title: '水桶资产', path: '/bucket-asset' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bucket')}>
              返回空桶回收
            </Button>
            <Space>
              <Button type="primary" icon={<TruckOutlined />} onClick={() => openForm('takeout')}>
                登记带出
              </Button>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openForm('sign')}>
                登记签收
              </Button>
              <Button type="primary" icon={<RollbackOutlined />} onClick={() => openForm('return')}>
                登记回收
              </Button>
            </Space>
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1 flex items-center gap-1">
              <TruckOutlined /> 今日带出
            </div>
            <div className="text-2xl font-bold text-blue-700">+{todaySummary.totalTakeout} 个</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1 flex items-center gap-1">
              <CheckCircleOutlined /> 今日签收
            </div>
            <div className="text-2xl font-bold text-green-700">+{todaySummary.totalSign} 个</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1 flex items-center gap-1">
              <RollbackOutlined /> 今日回收
            </div>
            <div className="text-2xl font-bold text-orange-700">-{todaySummary.totalReturn} 个</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">今日差额</div>
            <div className={`text-2xl font-bold ${
              todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn === 0 
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn > 0 ? '+' : ''}
              {todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn} 个
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <strong>平衡公式：</strong>带出桶数 = 客户签收桶数 + 回收空桶数
          {todaySummary.totalTakeout === todaySummary.totalSign + todaySummary.totalReturn ? (
            <Tag color="green" className="ml-2">已平衡</Tag>
          ) : (
            <Tag color="red" className="ml-2">不平衡</Tag>
          )}
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
          <TabPane tab="全部" key="all" />
          <TabPane tab={<span><TruckOutlined /> 带出</span>} key="takeout" />
          <TabPane tab={<span><CheckCircleOutlined /> 签收</span>} key="sign" />
          <TabPane tab={<span><RollbackOutlined /> 回收</span>} key="return" />
        </Tabs>

        <div className="mb-4 flex justify-between items-center gap-4">
          <Space className="flex-1">
            <Select
              placeholder="选择配送员筛选"
              allowClear
              style={{ width: 200 }}
              value={staffFilter || undefined}
              onChange={(value) => setStaffFilter(value || null)}
              showSearch
              optionFilterProp="children"
            >
              {staffs.map((staff) => (
                <Option key={staff.id} value={staff.id}>
                  {staff.name}
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
            共 {filteredCirculations.length} 条记录
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredCirculations}
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
        <CirculationForm
          defaultType={defaultType}
          onSuccess={handleFormSubmit}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default CirculationList;
