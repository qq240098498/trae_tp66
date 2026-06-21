import { useEffect } from 'react';
import { Form, Select, InputNumber, Button, Space, message, Card, Row, Col, Statistic } from 'antd';
import { useBucketStore } from '../../stores/bucketStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useOrderStore } from '../../stores/orderStore';
import { BucketReturnFormData } from '../../types';
import { InboxOutlined } from '@ant-design/icons';

interface BucketReturnFormProps {
  initialCustomerId?: string;
  initialOrderId?: string;
  maxQuantity?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BucketReturnForm = ({
  initialCustomerId,
  initialOrderId,
  maxQuantity,
  onSuccess,
  onCancel,
}: BucketReturnFormProps) => {
  const [form] = Form.useForm<BucketReturnFormData>();
  const { addReturn } = useBucketStore();
  const { customers, getCustomer } = useCustomerStore();
  const { orders, getOrder } = useOrderStore();

  const selectedCustomerId = Form.useWatch('customerId', form);
  const selectedOrderId = Form.useWatch('orderId', form);

  useEffect(() => {
    if (initialCustomerId) {
      form.setFieldsValue({ customerId: initialCustomerId });
    }
  }, [initialCustomerId, form]);

  useEffect(() => {
    if (initialOrderId) {
      const order = getOrder(initialOrderId);
      if (order) {
        form.setFieldsValue({
          orderId: initialOrderId,
          customerId: order.customerId,
        });
      }
    }
  }, [initialOrderId, form, getOrder]);

  const availableOrders = selectedCustomerId
    ? orders.filter(
        (o) =>
          o.customerId === selectedCustomerId &&
          o.status !== 'cancelled' &&
          o.returnedBuckets < o.quantity
      )
    : [];

  const selectedOrder = selectedOrderId ? getOrder(selectedOrderId) : null;
  const selectedCustomer = selectedCustomerId ? getCustomer(selectedCustomerId) : null;

  const calculatedMaxQuantity = maxQuantity ??
    (selectedOrder
      ? selectedOrder.quantity - selectedOrder.returnedBuckets
      : selectedCustomer?.emptyBuckets ?? 50);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (values.quantity > calculatedMaxQuantity) {
        message.error(`回收数量不能超过最大可回收数量 ${calculatedMaxQuantity} 桶`);
        return;
      }

      addReturn(values);
      message.success('空桶回收登记成功');
      form.resetFields();
      onSuccess?.();
    } catch {
      // 表单验证失败
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ quantity: 1 }}
    >
      <Form.Item
        name="customerId"
        label="选择客户"
        rules={[{ required: true, message: '请选择客户' }]}
      >
        <Select
          placeholder="请选择客户"
          showSearch
          optionFilterProp="label"
          options={customers.map((c) => ({
            value: c.id,
            label: `${c.name} - ${c.phone}`,
          }))}
        />
      </Form.Item>

      {selectedCustomer && (
        <Card size="small" className="mb-4 bg-blue-50 border-blue-200">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="当前空桶数"
                value={selectedCustomer.emptyBuckets}
                suffix="桶"
                prefix={<InboxOutlined />}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="最大可回收"
                value={calculatedMaxQuantity}
                suffix="桶"
                valueStyle={{ fontSize: '16px', color: '#1890ff' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Form.Item
        name="orderId"
        label="关联订单（可选）"
      >
        <Select
          placeholder="选择关联的订单"
          allowClear
          disabled={!selectedCustomerId}
          options={availableOrders.map((o) => ({
            value: o.id,
            label: `#${o.id.slice(-6)} - ${o.brand} ${o.quantity}桶 (已回收${o.returnedBuckets}桶)`,
          }))}
        />
      </Form.Item>

      {selectedOrder && (
        <Card size="small" className="mb-4 bg-orange-50 border-orange-200">
          <div className="text-sm">
            <div className="text-gray-700 mb-1">
              <strong>订单信息：</strong>#{selectedOrder.id.slice(-6)} - {selectedOrder.brand}
            </div>
            <div className="text-gray-600">
              订单数量: {selectedOrder.quantity} 桶 | 已回收: {selectedOrder.returnedBuckets} 桶 | 剩余待回收: {selectedOrder.quantity - selectedOrder.returnedBuckets} 桶
            </div>
          </div>
        </Card>
      )}

      <Form.Item
        name="quantity"
        label={`回收数量（桶）${calculatedMaxQuantity ? ` - 最大 ${calculatedMaxQuantity} 桶` : ''}`}
        rules={[
          { required: true, message: '请输入回收数量' },
          { type: 'number', min: 1, message: '回收数量至少为 1 桶' },
        ]}
      >
        <InputNumber
          min={1}
          max={calculatedMaxQuantity}
          className="w-full"
          placeholder="请输入回收空桶的数量"
        />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            确认回收
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default BucketReturnForm;
