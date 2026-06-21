import { useState, useEffect } from 'react';
import { Table, Button, DatePicker, Card, Tag, Space, message, Modal, Input, Tabs } from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  TruckOutlined,
  CheckSquareOutlined,
  RollbackOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useBucketAssetStore } from '../../stores/bucketAssetStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { getToday, dayjs } from '../../utils/date';
import { BucketReconciliation } from '../../types';

const { TextArea } = Input;
const { TabPane } = Tabs;

const statusColors: Record<string, string> = {
  matched: 'green',
  mismatch: 'red',
  resolved: 'orange',
};

const statusLabels: Record<string, string> = {
  matched: '已平衡',
  mismatch: '不平衡',
  resolved: '已处理',
};

const statusIcons: Record<string, React.ReactNode> = {
  matched: <CheckCircleOutlined />,
  mismatch: <ExclamationCircleOutlined />,
  resolved: <WarningOutlined />,
};

const DailyReconciliation = () => {
  const navigate = useNavigate();
  const {
    getDailySummary,
    getReconciliationsByDate,
    generateStaffReconciliation,
    resolveReconciliation,
    reconciliations,
    getCirculationsByStaff,
    getDamagesByDate,
  } = useBucketAssetStore();
  const { staffs } = useDeliveryStore();
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [reconciliationList, setReconciliationList] = useState<BucketReconciliation[]>([]);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [currentReconciliation, setCurrentReconciliation] = useState<BucketReconciliation | null>(null);
  const [resolveRemark, setResolveRemark] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const todaySummary = getDailySummary(selectedDate);

  useEffect(() => {
    loadReconciliations();
  }, [selectedDate]);

  const loadReconciliations = () => {
    const recs = getReconciliationsByDate(selectedDate);
    if (recs.length === 0) {
      const newRecs: BucketReconciliation[] = [];
      staffs.forEach((staff) => {
        const rec = generateStaffReconciliation(staff.id, selectedDate);
        newRecs.push(rec);
      });
      setReconciliationList(newRecs);
    } else {
      setReconciliationList(recs);
    }
  };

  const handleGenerateAll = () => {
    const newRecs: BucketReconciliation[] = [];
    staffs.forEach((staff) => {
      const rec = generateStaffReconciliation(staff.id, selectedDate);
      newRecs.push(rec);
    });
    setReconciliationList(newRecs);
    message.success('已重新生成对账数据');
  };

  const handleGenerate = (staffId: string) => {
    generateStaffReconciliation(staffId, selectedDate);
    loadReconciliations();
    message.success('对账数据已更新');
  };

  const handleResolve = (record: BucketReconciliation) => {
    setCurrentReconciliation(record);
    setResolveRemark('');
    setResolveModalVisible(true);
  };

  const confirmResolve = () => {
    if (!currentReconciliation || !resolveRemark.trim()) {
      message.error('请填写差异原因说明');
      return;
    }
    resolveReconciliation(currentReconciliation.id, resolveRemark);
    loadReconciliations();
    setResolveModalVisible(false);
    message.success('差异已处理');
  };

  const filteredReconciliations = reconciliationList.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const columns = [
    {
      title: '配送员',
      dataIndex: 'staffId',
      key: 'staffId',
      render: (staffId: string) => {
        const staff = staffs.find((s) => s.id === staffId);
        return staff?.name || '未知';
      },
    },
    {
      title: '带出桶数',
      dataIndex: 'takeoutCount',
      key: 'takeoutCount',
      render: (count: number) => (
        <span className="text-blue-600 font-medium flex items-center gap-1">
          <TruckOutlined /> +{count}
        </span>
      ),
    },
    {
      title: '客户签收桶数',
      dataIndex: 'signCount',
      key: 'signCount',
      render: (count: number) => (
        <span className="text-green-600 font-medium flex items-center gap-1">
          <CheckSquareOutlined /> {count}
        </span>
      ),
    },
    {
      title: '回收空桶数',
      dataIndex: 'returnCount',
      key: 'returnCount',
      render: (count: number) => (
        <span className="text-orange-600 font-medium flex items-center gap-1">
          <RollbackOutlined /> {count}
        </span>
      ),
    },
    {
      title: '桶损/丢失数',
      dataIndex: 'damageCount',
      key: 'damageCount',
      render: (count: number) => (
        <span className={count > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
          <BugOutlined /> {count}
        </span>
      ),
    },
    {
      title: '差额',
      dataIndex: 'difference',
      key: 'difference',
      render: (diff: number, record: BucketReconciliation) => (
        <div className="text-center">
          <span className={`text-lg font-bold ${
            diff === 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {diff > 0 ? '+' : ''}{diff} 个
          </span>
          <div className="text-xs text-gray-500 mt-1">
            公式: {record.takeoutCount} - {record.signCount} - {record.returnCount} - {record.damageCount}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag icon={statusIcons[status]} color={statusColors[status]}>
          {statusLabels[status]}
        </Tag>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark?: string) => remark || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: BucketReconciliation) => (
        <Space>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleGenerate(record.staffId)}
          >
            重新计算
          </Button>
          {record.status === 'mismatch' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolve(record)}
            >
              处理差异
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const mismatchCount = reconciliationList.filter((r) => r.status === 'mismatch').length;
  const matchedCount = reconciliationList.filter((r) => r.status === 'matched').length;
  const resolvedCount = reconciliationList.filter((r) => r.status === 'resolved').length;

  return (
    <div>
      <PageHeader
        title="每日平账"
        breadcrumbs={[{ title: '水桶资产', path: '/bucket-asset' }]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bucket')}>
              返回空桶回收
            </Button>
            <DatePicker
              value={dayjs(selectedDate)}
              onChange={(date) => {
                if (date) {
                  setSelectedDate(date.format('YYYY-MM-DD'));
                }
              }}
            />
            <Button type="primary" icon={<ReloadOutlined />} onClick={handleGenerateAll}>
              重新对账
            </Button>
          </Space>
        }
      />

      <Card className="mb-6 border-0 shadow-sm">
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 mb-1 flex items-center gap-1">
              <TruckOutlined /> 带出总数
            </div>
            <div className="text-2xl font-bold text-blue-700">+{todaySummary.totalTakeout} 个</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 mb-1 flex items-center gap-1">
              <CheckSquareOutlined /> 签收总数
            </div>
            <div className="text-2xl font-bold text-green-700">{todaySummary.totalSign} 个</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1 flex items-center gap-1">
              <RollbackOutlined /> 回收总数
            </div>
            <div className="text-2xl font-bold text-orange-700">{todaySummary.totalReturn} 个</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-600 mb-1 flex items-center gap-1">
              <BugOutlined /> 桶损/丢失
            </div>
            <div className="text-2xl font-bold text-red-700">{todaySummary.totalDamage} 个</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">总差额</div>
            <div className={`text-2xl font-bold ${
              todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn - todaySummary.totalDamage === 0
                ? 'text-green-600' : 'text-red-600'
            }`}>
              {todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn - todaySummary.totalDamage > 0 ? '+' : ''}
              {todaySummary.totalTakeout - todaySummary.totalSign - todaySummary.totalReturn - todaySummary.totalDamage} 个
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <strong>平衡公式：</strong>配送员带出桶数 = 客户签收桶数 + 回收空桶数 + 桶损/丢失数
          <br />
          <strong>当前：</strong>{todaySummary.totalTakeout} = {todaySummary.totalSign} + {todaySummary.totalReturn} + {todaySummary.totalDamage}
          {todaySummary.totalTakeout === todaySummary.totalSign + todaySummary.totalReturn + todaySummary.totalDamage ? (
            <Tag color="green" className="ml-2">整体已平衡</Tag>
          ) : (
            <Tag color="red" className="ml-2">整体不平衡</Tag>
          )}
        </div>
      </Card>

      <Card className="border-0 shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab} className="mb-4">
          <TabPane tab={`全部 (${reconciliationList.length})`} key="all" />
          <TabPane tab={`已平衡 (${matchedCount})`} key="matched" />
          <TabPane tab={`不平衡 (${mismatchCount})`} key="mismatch" />
          <TabPane tab={`已处理 (${resolvedCount})`} key="resolved" />
        </Tabs>

        <Table
          columns={columns}
          dataSource={filteredReconciliations}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title="处理对账差异"
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        footer={null}
        destroyOnClose
        width={500}
      >
        {currentReconciliation && (
          <div>
            <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm">
              <div className="font-bold text-red-700 mb-2">
                配送员：{staffs.find((s) => s.id === currentReconciliation.staffId)?.name}
              </div>
              <div className="text-red-600">
                差额：<span className="font-bold">{currentReconciliation.difference > 0 ? '+' : ''}{currentReconciliation.difference} 个</span>
              </div>
              <div className="text-gray-600 mt-1">
                带出 {currentReconciliation.takeoutCount} - 签收 {currentReconciliation.signCount} - 回收 {currentReconciliation.returnCount} - 桶损 {currentReconciliation.damageCount} = {currentReconciliation.difference}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                差异原因说明 <span className="text-red-500">*</span>
              </label>
              <TextArea
                rows={4}
                placeholder="请详细说明差异原因，如：客户未退桶、配送途中损坏、已登记桶损等"
                value={resolveRemark}
                onChange={(e) => setResolveRemark(e.target.value)}
              />
            </div>

            <Space className="w-full justify-end">
              <Button onClick={() => setResolveModalVisible(false)}>取消</Button>
              <Button type="primary" onClick={confirmResolve}>
                确认处理
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DailyReconciliation;
