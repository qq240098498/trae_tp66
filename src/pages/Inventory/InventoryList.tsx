import { useState } from 'react';
import { Card, Button, Modal, Form, Select, InputNumber, Input, Row, Col, Tag, message } from 'antd';
import { PlusOutlined, MinusOutlined, DatabaseOutlined, ContainerOutlined, HistoryOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useOrderStore } from '../../stores/orderStore';
import { InventoryLogType } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

const InventoryList = () => {
  const { inventories, logs, updateInventory } = useInventoryStore();
  const { getTodayOrders } = useOrderStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [form] = Form.useForm();

  const todayOrders = getTodayOrders();
  const todayDelivered = todayOrders
    .filter((o) => o.status === 'completed' || o.status === 'delivering')
    .reduce((sum, o) => sum + o.quantity, 0);

  const totalFullBuckets = inventories.reduce((sum, i) => sum + i.fullBuckets, 0);
  const totalEmptyBuckets = inventories.reduce((sum, i) => sum + i.emptyBuckets, 0);

  const chartData = inventories.map((inv, index) => ({
    name: inv.brand,
    满桶: inv.fullBuckets,
    空桶: inv.emptyBuckets,
    color: COLORS[index % COLORS.length],
  }));

  const handleOpenModal = (type: 'in' | 'out') => {
    setModalType(type);
    setModalVisible(true);
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const { brand, fullQuantity, emptyQuantity, remark } = values;

    const type: InventoryLogType = modalType === 'in' ? 'purchase' : 'sale';
    const fullDelta = modalType === 'in' ? fullQuantity : -fullQuantity;
    const emptyDelta = modalType === 'in' ? emptyQuantity : -emptyQuantity;

    updateInventory(
      brand,
      fullDelta,
      emptyDelta,
      type,
      remark || (modalType === 'in' ? '采购入库' : '销售出库')
    );

    message.success('操作成功');
    setModalVisible(false);
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

  return (
    <div>
      <PageHeader
        title="库存概览"
        breadcrumbs={[{ title: '水桶资产管理' }]}
        extra={
          <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal('in')}>
              入库登记
            </Button>
            <Button icon={<MinusOutlined />} onClick={() => handleOpenModal('out')}>
              出库登记
            </Button>
          </div>
        }
      />

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总满桶库存"
            value={totalFullBuckets}
            icon={<ContainerOutlined />}
            color="blue"
            trend={5.2}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="总空桶库存"
            value={totalEmptyBuckets}
            icon={<DatabaseOutlined />}
            color="orange"
            trend={-2.1}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="今日配送"
            value={todayDelivered}
            icon={<CheckCircleOutlined />}
            color="green"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="库存品牌"
            value={inventories.length}
            icon={<HistoryOutlined />}
            color="purple"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
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
        <Col xs={24} lg={8}>
          <Card title="库存明细" className="border-0 shadow-sm">
            <div className="space-y-4">
              {inventories.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-800">{inv.brand}</div>
                    <div className="text-sm text-gray-500">
                      更新于 {new Date(inv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-2">
                      <Tag color="blue">满桶 {inv.fullBuckets}</Tag>
                      <Tag color="orange">空桶 {inv.emptyBuckets}</Tag>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

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
                      {new Date(log.createdAt).toLocaleTimeString()}
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
        title={modalType === 'in' ? '入库登记' : '出库登记'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="确认"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
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
        </Form>
      </Modal>
    </div>
  );
};

export default InventoryList;
