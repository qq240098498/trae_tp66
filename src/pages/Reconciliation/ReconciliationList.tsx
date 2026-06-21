import { useState } from 'react';
import { Table, Button, Space, Card, Tag, Modal, Form, Input, message, DatePicker } from 'antd';
import { PlusOutlined, HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useInventoryStore } from '../../stores/inventoryStore';
import type { Reconciliation, ReconciliationStatus } from '../../types';
import type { Dayjs } from 'dayjs';

const statusColors: Record<ReconciliationStatus, string> = {
  matched: 'green',
  mismatch: 'red',
  resolved: 'blue',
};

const statusLabels: Record<ReconciliationStatus, string> = {
  matched: '已匹配',
  mismatch: '不匹配',
  resolved: '已处理',
};

const statusIcons: Record<ReconciliationStatus, React.ReactNode> = {
  matched: <CheckCircleOutlined className="text-green-500" />,
  mismatch: <ExclamationCircleOutlined className="text-red-500" />,
  resolved: <QuestionCircleOutlined className="text-blue-500" />,
};

const ReconciliationList = () => {
  const navigate = useNavigate();
  const { reconciliations, generateReconciliation, resolveReconciliation } = useInventoryStore();
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [currentReconciliation, setCurrentReconciliation] = useState<Reconciliation | null>(null);
  const [form] = Form.useForm();
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

  const handleGenerate = () => {
    const date = selectedDate ? selectedDate.format('YYYY-MM-DD') : undefined;
    const reconciliation = generateReconciliation(date);
    message.success(`已生成${reconciliation.date}的对账单`);
  };

  const handleResolve = (reconciliation: Reconciliation) => {
    setCurrentReconciliation(reconciliation);
    form.setFieldsValue({ remark: '' });
    setResolveModalVisible(true);
  };

  const handleSubmitResolve = async () => {
    try {
      const values = await form.validateFields();
      if (!currentReconciliation) return;

      resolveReconciliation(currentReconciliation.id, values.remark);
      message.success('已标记为已处理');
      setResolveModalVisible(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const columns = [
    {
      title: '对账日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => (
        <span className="font-medium text-gray-800">{date}</span>
      ),
    },
    {
      title: '配送总数',
      dataIndex: 'totalDelivered',
      key: 'totalDelivered',
      render: (count: number) => (
        <span className="text-blue-600 font-medium">{count} 桶</span>
      ),
    },
    {
      title: '回收总数',
      dataIndex: 'totalReturned',
      key: 'totalReturned',
      render: (count: number) => (
        <span className="text-orange-600 font-medium">{count} 桶</span>
      ),
    },
    {
      title: '差异',
      dataIndex: 'difference',
      key: 'difference',
      render: (diff: number) => (
        <span className={`font-bold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-orange-600' : 'text-green-600'}`}>
          {diff > 0 ? '+' : ''}{diff} 桶
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ReconciliationStatus) => (
        <div className="flex items-center gap-2">
          {statusIcons[status]}
          <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
        </div>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark?: string) => (
        <span className="text-gray-500">{remark || '-'}</span>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record: Reconciliation) => (
        <Space>
          {record.status === 'mismatch' && (
            <Button
              type="link"
              onClick={() => handleResolve(record)}
            >
              标记处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const sortedReconciliations = [...reconciliations].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div>
      <PageHeader
        title="对账中心"
        extra={
          <Space>
            <DatePicker
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="选择日期"
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate}>
              生成对账
            </Button>
            <Button icon={<HistoryOutlined />} onClick={() => navigate('/reconciliation/history')}>
              历史记录
            </Button>
          </Space>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4">
          <span className="text-gray-500 text-sm">
            共 {sortedReconciliations.length} 条对账记录
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={sortedReconciliations}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="标记为已处理"
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitResolve}>
          <Form.Item label="对账信息">
            <div className="space-y-2 text-sm">
              <div>日期：{currentReconciliation?.date}</div>
              <div>配送：{currentReconciliation?.totalDelivered} 桶</div>
              <div>回收：{currentReconciliation?.totalReturned} 桶</div>
              <div className="text-red-600 font-medium">
                差异：{currentReconciliation?.difference} 桶
              </div>
            </div>
          </Form.Item>
          <Form.Item
            name="remark"
            label="处理说明"
            rules={[{ required: true, message: '请输入处理说明' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入差异处理说明" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">确认</Button>
              <Button onClick={() => setResolveModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ReconciliationList;
