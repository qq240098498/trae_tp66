import { useState } from 'react';
import { Table, Button, Input, Card, Select, DatePicker } from 'antd';
import { SearchOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useInventoryStore } from '../../stores/inventoryStore';
import { formatDateTime } from '../../utils/date';
import { dayjs } from '../../utils/date';
import type { InventoryLogType, InventoryLog } from '../../types';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

const logTypeLabels: Record<InventoryLogType, string> = {
  purchase: '采购入库',
  sale: '销售出库',
  return: '退货入库',
  scrap: '报废出库',
  adjust: '库存调整',
};

const logTypeColors: Record<InventoryLogType, string> = {
  purchase: 'green',
  sale: 'red',
  return: 'blue',
  scrap: 'orange',
  adjust: 'purple',
};

const InventoryStock = () => {
  const navigate = useNavigate();
  const { logs, inventories } = useInventoryStore();
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<InventoryLogType | 'all'>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

  const filteredLogs = logs
    .slice()
    .reverse()
    .filter((log) => {
      const inventory = inventories.find((i) => i.id === log.inventoryId);
      const matchesSearch =
        inventory?.brand.includes(searchText) ||
        log.remark.includes(searchText);

      const matchesType = typeFilter === 'all' || log.type === typeFilter;

      const matchesDate =
        !dateRange ||
        (dayjs(log.createdAt).isAfter(dateRange[0].startOf('day')) &&
          dayjs(log.createdAt).isBefore(dateRange[1].endOf('day')));

      return matchesSearch && matchesType && matchesDate;
    });

  const columns = [
    {
      title: '品牌',
      key: 'brand',
      render: (_, record: InventoryLog) => {
        const inv = inventories.find((i) => i.id === record.inventoryId);
        return <span className="text-gray-800 font-medium">{inv?.brand}</span>;
      },
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: InventoryLogType) => (
        <span className={`px-2 py-1 rounded text-sm ${logTypeColors[type] === 'green' ? 'bg-green-50 text-green-600' : logTypeColors[type] === 'red' ? 'bg-red-50 text-red-600' : logTypeColors[type] === 'blue' ? 'bg-blue-50 text-blue-600' : logTypeColors[type] === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
          {logTypeLabels[type]}
        </span>
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => (
        <span className={`font-bold ${qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {qty > 0 ? '+' : ''}{qty}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      render: (remark: string) => <span className="text-gray-600">{remark}</span>,
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => <span className="text-gray-500">{formatDateTime(date)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="库存流水"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/inventory')}>
            返回
          </Button>
        }
      />
      <Card className="border-0 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <Input
            placeholder="搜索品牌、备注"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-xs"
            allowClear
          />
          <Select
            placeholder="变动类型"
            value={typeFilter}
            onChange={setTypeFilter}
            className="w-36"
            allowClear
          >
            <Select.Option value="all">全部类型</Select.Option>
            <Select.Option value="purchase">采购入库</Select.Option>
            <Select.Option value="sale">销售出库</Select.Option>
            <Select.Option value="return">退货入库</Select.Option>
            <Select.Option value="scrap">报废出库</Select.Option>
            <Select.Option value="adjust">库存调整</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={['开始日期', '结束日期']}
          />
          <span className="text-gray-500 text-sm ml-auto">
            共 {filteredLogs.length} 条记录
          </span>
        </div>
        <Table
          columns={columns}
          dataSource={filteredLogs}
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

export default InventoryStock;
