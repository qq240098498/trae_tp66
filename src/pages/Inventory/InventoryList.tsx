import { useState } from 'react';
import { Card, Button, Modal, Form, Select, InputNumber, Input, Row, Col, Tag, message, Table, DatePicker, Space, Popconfirm } from 'antd';
import { PlusOutlined, MinusOutlined, DatabaseOutlined, ContainerOutlined, HistoryOutlined, CheckCircleOutlined, WarningOutlined, ThunderboltOutlined, ExclamationCircleOutlined, TagsOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { useInventoryStore, getBatchRemainingDays, computeBatchStatus } from '../../stores/inventoryStore';
import { useOrderStore } from '../../stores/orderStore';
import { InventoryLogType, InventoryBatch, BatchStatus } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dayjs } from '../../utils/date';
import type { ColumnsType } from 'antd/es/table';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const batchStatusLabels: Record<BatchStatus, string> = {
  normal: '正常',
  approaching: '临期',
  discount: '降价',
  expired: '过期',
};

const batchStatusColors: Record<BatchStatus, string> = {
  normal: 'green',
  approaching: 'orange',
  discount: 'blue',
  expired: 'red',
};

const InventoryList = () => {
  const { inventories, logs, updateInventory, addBatch, consumeBatchesForOrder, setBatchDiscount, revertBatchDiscount, getApproachingBatches, getDiscountBatches, getExpiredBatches } = useInventoryStore();
  const { getTodayOrders } = useOrderStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out' | 'batch'>('in');
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);
  const [form] = Form.useForm();
  const [discountForm] = Form.useForm();

  const todayOrders = getTodayOrders();
  const todayDelivered = todayOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((sum, o) => sum + o.quantity, 0);

  const totalFullBuckets = inventories.reduce((sum, i) => sum + i.fullBuckets, 0);
  const totalEmptyBuckets = inventories.reduce((sum, i) => sum + i.emptyBuckets, 0);

  const approachingCount = getApproachingBatches().reduce((sum, b) => sum + b.quantity, 0);
  const discountCount = getDiscountBatches().reduce((sum, b) => sum + b.quantity, 0);
  const expiredCount = getExpiredBatches().reduce((sum, b) => sum + b.quantity, 0);

  const chartData = inventories.map((inv, index) => ({
    name: inv.brand,
    满桶: inv.fullBuckets,
    空桶: inv.emptyBuckets,
    color: COLORS[index % COLORS.length],
  }));

  const allBatches = inventories.flatMap((inv) => inv.batches || []).filter((b) => b.quantity > 0);

  const handleOpenModal = (type: 'in' | 'out' | 'batch') => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    if (modalType === 'batch') {
      const { brand, batchNo, productionDate, quantity } = values;
      addBatch(brand, batchNo, productionDate.toISOString(), quantity);
      message.success('批次入库成功');
    } else {
      const { brand, fullQuantity, emptyQuantity, remark } = values;
      const type: InventoryLogType = modalType === 'in' ? 'purchase' : 'sale';
      const fullDelta = modalType === 'in' ? fullQuantity : -fullQuantity;
      const emptyDelta = modalType === 'in' ? emptyQuantity : -emptyQuantity;

      if (modalType === 'out' && fullQuantity > 0) {
        const result = consumeBatchesForOrder(brand, fullQuantity);
        if (result.consumed < fullQuantity) {
          message.warning(`库存不足，仅出库 ${result.consumed} 桶`);
        }
        if (result.discountApplied) {
          message.info('已优先使用降价批次');
        }
      } else {
        updateInventory(
          brand,
          fullDelta,
          emptyDelta,
          type,
          remark || (modalType === 'in' ? '采购入库' : '销售出库')
        );
      }
    }

    setModalVisible(false);
  };

  const handleOpenDiscountModal = (batch: InventoryBatch) => {
    setSelectedBatch(batch);
    discountForm.setFieldsValue({ discountPrice: batch.discountPrice || 15 });
    setDiscountModalVisible(true);
  };

  const handleSetDiscount = async () => {
    const values = await discountForm.validateFields();
    if (selectedBatch) {
      setBatchDiscount(selectedBatch.id, values.discountPrice);
      message.success('已设置降价促销');
      setDiscountModalVisible(false);
      setSelectedBatch(null);
    }
  };

  const handleRevertDiscount = (batchId: string) => {
    revertBatchDiscount(batchId);
    message.success('已取消降价标记');
  };

  const logTypeLabels: Record<string, string> = {
    purchase: '采购入库',
    sale: '销售出库',
    return: '客户退回',
    scrap: '报废',
    adjust: '盘点调整',
  };

  const logTypeColors: Record<string, string> = {
    purchase: 'green',
    sale: 'blue',
    return: 'cyan',
    scrap: 'red',
    adjust: 'orange',
  };

  const recentLogs = [...logs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const batchColumns: ColumnsType<InventoryBatch> = [
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: '批次号',
      dataIndex: 'batchNo',
      key: 'batchNo',
      width: 140,
    },
    {
      title: '生产日期',
      dataIndex: 'productionDate',
      key: 'productionDate',
      width: 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '剩余天数',
      key: 'remainingDays',
      width: 100,
      render: (_, record) => {
        const days = getBatchRemainingDays(record.productionDate);
        if (days <= 0) return <span className="text-red-600 font-bold">已过期</span>;
        if (days <= 30) return <span className="text-orange-600 font-bold">{days}天</span>;
        return <span className="text-gray-600">{days}天</span>;
      },
    },
    {
      title: '库存数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (qty: number) => <span className="font-semibold">{qty}桶</span>,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const status = computeBatchStatus(record);
        return (
          <Tag color={batchStatusColors[status]}>
            {status === 'discount' && record.discountPrice
              ? `降价 ¥${record.discountPrice}`
              : batchStatusLabels[status]}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => {
        const status = computeBatchStatus(record);
        return (
          <Space size="small">
            {status === 'approaching' && (
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={() => handleOpenDiscountModal(record)}
              >
                降价处理
              </Button>
            )}
            {status === 'discount' && (
            <Popconfirm title="确定取消降价标记？" onConfirm={() => handleRevertDiscount(record.id)}>
              <Button type="link" size="small">
                取消降价
              </Button>
            </Popconfirm>
          )}
        </Space>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="库存概览"
        breadcrumbs={[{ title: '水桶资产管理' }]}
        extra={
          <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal('batch')}>
              批次入库
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => handleOpenModal('in')}>
              入库登记
            </Button>
            <Button icon={<MinusOutlined />} onClick={() => handleOpenModal('out')}>
              出库登记
            </Button>
          </div>
        }
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="总满桶库存"
            value={totalFullBuckets}
            icon={<ContainerOutlined />}
            color="blue"
            trend={5.2}
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="总空桶库存"
            value={totalEmptyBuckets}
            icon={<DatabaseOutlined />}
            color="orange"
            trend={-2.1}
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="今日配送"
            value={todayDelivered}
            icon={<CheckCircleOutlined />}
            color="green"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="临期水"
            value={approachingCount}
            icon={<WarningOutlined />}
            color="orange"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="降价促销"
            value={discountCount}
            icon={<ThunderboltOutlined />}
            color="blue"
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <StatCard
            title="已过期"
            value={expiredCount}
            icon={<ExclamationCircleOutlined />}
            color="red"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="各品牌库存分布" className="border-0 shadow-sm">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="满桶" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="空桶" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="库存明细（按品牌）" className="border-0 shadow-sm">
            <div className="space-y-4">
              {inventories.map((inv) => {
                const approachingQty = (inv.batches || [])
                  .filter((b) => {
                    const s = computeBatchStatus(b);
                    return s === 'approaching' || s === 'discount';
                  })
                  .reduce((sum, b) => sum + b.quantity, 0);
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-800">{inv.brand}</div>
                      <div className="text-sm text-gray-500">
                        更新于 {dayjs(inv.updatedAt).format('YYYY-MM-DD')} · {(inv.batches || []).length} 个批次
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Tag color="blue">满桶 {inv.fullBuckets}</Tag>
                        <Tag color="orange">空桶 {inv.emptyBuckets}</Tag>
                        {approachingQty > 0 && (
                          <Tag color="orange" icon={<WarningOutlined />}>
                            临期 {approachingQty}
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span className="flex items-center gap-2">
            <TagsOutlined />
            批次管理
          </span>
        }
        className="border-0 shadow-sm mt-6"
        extra={<span className="text-sm text-gray-500">共 {allBatches.length} 个批次</span>}
      >
        <Table
          columns={batchColumns}
          dataSource={allBatches}
          rowKey="id"
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Card title="最近出入库记录" className="border-0 shadow-sm mt-6">
        <Row gutter={[16, 16]}>
          {recentLogs.map((log) => {
            const inventory = inventories.find((i) => i.id === log.inventoryId);
            return (
              <Col xs={24} sm={12} lg={6} key={log.id}>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Tag color={logTypeColors[log.type]}>{logTypeLabels[log.type]}</Tag>
                    <span className="text-sm text-gray-500">
                      {dayjs(log.createdAt).format('HH:mm')}
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {inventory?.brand}
                  </div>
                  <div className="text-sm text-gray-600">
                    数量：
                    <span className={log.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                      {log.quantity > 0 ? '+' : ''}
                      {log.quantity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{log.remark}</div>
                </div>
              </Col>
            );
          })}
          {recentLogs.length === 0 && (
            <Col span={24}>
              <div className="text-center py-8 text-gray-400">暂无记录</div>
            </Col>
          )}
        </Row>
      </Card>

      <Modal
        title={modalType === 'batch' ? '批次入库' : modalType === 'in' ? '入库登记' : '出库登记'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {modalType === 'batch' ? (
            <>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请选择品牌' }]}
              >
                <Select placeholder="请选择品牌">
                  {inventories.map((inv) => (
                    <Select.Option key={inv.id} value={inv.brand}>
                      {inv.brand}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name="batchNo"
                label="批次号"
                rules={[{ required: true, message: '请输入批次号' }]}
              >
                <Input placeholder="如：NF20240615" />
              </Form.Item>
              <Form.Item
                name="productionDate"
                label="生产日期"
                rules={[{ required: true, message: '请选择生产日期' }]}
              >
                <DatePicker className="w-full" placeholder="选择生产日期" />
              </Form.Item>
              <Form.Item
                name="quantity"
                label="入库数量（桶）"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber min={1} className="w-full" placeholder="入库数量" />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item
                name="brand"
                label="品牌"
                rules={[{ required: true, message: '请选择品牌' }]}
              >
                <Select placeholder="请选择品牌">
                  {inventories.map((inv) => (
                    <Select.Option key={inv.id} value={inv.brand}>
                      {inv.brand}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="fullQuantity"
                    label="满桶数量"
                    rules={[{ required: true, message: '请输入满桶数量' }]}
                    initialValue={0}
                  >
                    <InputNumber min={0} className="w-full" placeholder="满桶数量" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="emptyQuantity"
                    label="空桶数量"
                    rules={[{ required: true, message: '请输入空桶数量' }]}
                    initialValue={0}
                  >
                    <InputNumber min={0} className="w-full" placeholder="空桶数量" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={3} placeholder="请输入备注信息" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        title="设置降价促销"
        open={discountModalVisible}
        onCancel={() => {
          setDiscountModalVisible(false);
          setSelectedBatch(null);
        }}
        onOk={handleSetDiscount}
        okText="确认降价"
        cancelText="取消"
        destroyOnClose
      >
        {selectedBatch && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">品牌</div>
              <div className="font-medium text-gray-800">{selectedBatch.brand}</div>
              <div className="text-sm text-gray-500 mt-2">批次号</div>
              <div className="font-medium text-gray-800">{selectedBatch.batchNo}</div>
              <div className="text-sm text-gray-500 mt-2">当前库存</div>
              <div className="font-medium text-gray-800">{selectedBatch.quantity} 桶</div>
              <div className="text-sm text-gray-500 mt-2">剩余保质期</div>
              <div className="font-medium text-orange-600">
                {getBatchRemainingDays(selectedBatch.productionDate)} 天
              </div>
            </div>
            <Form form={discountForm} layout="vertical">
              <Form.Item
                name="discountPrice"
                label="促销单价（元/桶）"
                rules={[
                  { required: true, message: '请输入促销价格' },
                  { type: 'number', min: 1, message: '价格必须大于0' },
                ]}
              >
                <InputNumber min={1} className="w-full" placeholder="如：15" />
              </Form.Item>
              <div className="text-xs text-gray-500">
                设置后该批次将优先出货，客户下单时将自动应用该价格
              </div>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InventoryList;
