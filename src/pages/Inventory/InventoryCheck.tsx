import { useState } from 'react';
import { Table, Button, InputNumber, Space, Card, Tag, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useInventoryStore } from '../../stores/inventoryStore';
import { formatDateTime } from '../../utils/date';
import type { InventoryCheck, InventoryCheckItem } from '../../types';

const InventoryCheck = () => {
  const navigate = useNavigate();
  const { checks, createCheck, updateCheckItem, completeCheck } = useInventoryStore();
  const [currentCheck, setCurrentCheck] = useState<InventoryCheck | null>(null);

  const handleCreateCheck = () => {
    const newCheck = createCheck();
    setCurrentCheck(newCheck);
  };

  const handleUpdateItem = (checkId: string, inventoryId: string, field: 'actualFullBuckets' | 'actualEmptyBuckets', value: number) => {
    updateCheckItem(checkId, inventoryId, 
      field === 'actualFullBuckets' ? value : currentCheck?.items.find(i => i.inventoryId === inventoryId)?.actualFullBuckets || 0,
      field === 'actualEmptyBuckets' ? value : currentCheck?.items.find(i => i.inventoryId === inventoryId)?.actualEmptyBuckets || 0
    );
    
    if (currentCheck) {
      setCurrentCheck({
        ...currentCheck,
        items: currentCheck.items.map((item) =>
          item.inventoryId === inventoryId
            ? { ...item, [field]: value }
            : item
        ),
      });
    }
  };

  const handleCompleteCheck = () => {
    if (!currentCheck) return;
    completeCheck(currentCheck.id);
    message.success('盘点完成');
    setCurrentCheck(null);
  };

  const columns = [
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      render: (brand: string) => (
        <span className="font-medium text-gray-800">{brand}</span>
      ),
    },
    {
      title: '系统满桶',
      dataIndex: 'systemFullBuckets',
      key: 'systemFullBuckets',
      render: (count: number) => (
        <span className="text-gray-600">{count}</span>
      ),
    },
    {
      title: '系统空桶',
      dataIndex: 'systemEmptyBuckets',
      key: 'systemEmptyBuckets',
      render: (count: number) => (
        <span className="text-gray-600">{count}</span>
      ),
    },
    {
      title: '实际满桶',
      key: 'actualFullBuckets',
      render: (_, record: InventoryCheckItem) => (
        <InputNumber
          min={0}
          value={record.actualFullBuckets}
          onChange={(value) =>
            handleUpdateItem(currentCheck!.id, record.inventoryId, 'actualFullBuckets', value || 0)
          }
          disabled={currentCheck?.status === 'completed'}
        />
      ),
    },
    {
      title: '实际空桶',
      key: 'actualEmptyBuckets',
      render: (_, record: InventoryCheckItem) => (
        <InputNumber
          min={0}
          value={record.actualEmptyBuckets}
          onChange={(value) =>
            handleUpdateItem(currentCheck!.id, record.inventoryId, 'actualEmptyBuckets', value || 0)
          }
          disabled={currentCheck?.status === 'completed'}
        />
      ),
    },
    {
      title: '差异',
      key: 'diff',
      render: (_, record: InventoryCheckItem) => {
        const fullDiff = record.actualFullBuckets - record.systemFullBuckets;
        const emptyDiff = record.actualEmptyBuckets - record.systemEmptyBuckets;
        return (
          <div>
            {fullDiff !== 0 && (
              <div className={fullDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                满桶: {fullDiff > 0 ? '+' : ''}{fullDiff}
              </div>
            )}
            {emptyDiff !== 0 && (
              <div className={emptyDiff > 0 ? 'text-green-600' : 'text-red-600'}>
                空桶: {emptyDiff > 0 ? '+' : ''}{emptyDiff}
              </div>
            )}
            {fullDiff === 0 && emptyDiff === 0 && (
              <span className="text-gray-400">无差异</span>
            )}
          </div>
        );
      },
    },
  ];

  const historyChecks = checks.filter((c) => c.id !== currentCheck?.id).reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="库存盘点"
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory')}>
              返回
            </Button>
            {!currentCheck && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCheck}>
                新建盘点
              </Button>
            )}
          </Space>
        }
      />

      {currentCheck && (
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>当前盘点 - {currentCheck.date}</span>
              <Tag color={currentCheck.status === 'completed' ? 'green' : 'orange'}>
                {currentCheck.status === 'completed' ? '已完成' : '进行中'}
              </Tag>
            </div>
          }
          className="border-0 shadow-sm"
          extra={
            currentCheck.status !== 'completed' && (
              <Popconfirm
                title="确认完成盘点？"
                description="完成后将自动调整库存"
                onConfirm={handleCompleteCheck}
                okText="确认"
                cancelText="取消"
              >
                <Button type="primary" icon={<CheckOutlined />}>
                  完成盘点
                </Button>
              </Popconfirm>
            )
          }
        >
          <Table
            columns={columns}
            dataSource={currentCheck.items}
            rowKey="inventoryId"
            pagination={false}
          />
        </Card>
      )}

      <Card title="历史盘点" className="border-0 shadow-sm">
        {historyChecks.length > 0 ? (
          <Table
            dataSource={historyChecks}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: '盘点日期',
                dataIndex: 'date',
                key: 'date',
                render: (date: string) => (
                  <span className="text-gray-800">{date}</span>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (status: string) => (
                  <Tag color={status === 'completed' ? 'green' : 'orange'}>
                    {status === 'completed' ? '已完成' : '草稿'}
                  </Tag>
                ),
              },
              {
                title: '盘点项数',
                key: 'items',
                render: (_, record: InventoryCheck) => (
                  <span className="text-gray-600">{record.items.length} 项</span>
                ),
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (date: string) => (
                  <span className="text-gray-500">{formatDateTime(date)}</span>
                ),
              },
              {
                title: '操作',
                key: 'actions',
                render: (_, record: InventoryCheck) => (
                  <Button
                    type="link"
                    onClick={() => setCurrentCheck(record)}
                  >
                    查看详情
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">暂无历史盘点记录</div>
        )}
      </Card>
    </div>
  );
};

export default InventoryCheck;
