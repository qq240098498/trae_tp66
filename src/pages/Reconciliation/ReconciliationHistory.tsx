import { useState } from 'react';
import { Table, Button, Card, Tag, DatePicker } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useInventoryStore } from '../../stores/inventoryStore';
import { formatDateTime } from '../../utils/date';
import { dayjs } from '../../utils/date';
import type { ReconciliationStatus } from '../../types';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

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

const ReconciliationHistory = () => {
  const navigate = useNavigate();
  const { reconciliations } = useInventoryStore();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const filteredReconciliations = reconciliations
    .filter((r) => {
      if (!dateRange) return true;
      return (
        dayjs(r.date).isAfter(dateRange[0].startOf('day')) &&
        dayjs(r.date).isBefore(dateRange[1].endOf('day'))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

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
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
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
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-gray-500">{formatDateTime(date)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="对账历史"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/reconciliation')}>
            返回
          </Button>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={['开始日期', '结束日期']}
          />
          <span className="text-gray-500 text-sm ml-auto">
            共 {filteredReconciliations.length} 条记录
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={filteredReconciliations}
          rowKey="id"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>
    </div>
  );
};

export default ReconciliationHistory;
