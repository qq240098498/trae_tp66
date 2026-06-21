import { useState } from 'react';
import { Form, Card, Select, InputNumber, message, Button, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useBucketStore } from '../../stores/bucketStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useOrderStore } from '../../stores/orderStore';
import type { Customer, Order } from '../../types';

const { Option } = Select;

const BucketReturnRecord = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { addReturn } = useBucketStore();
  const { customers } = useCustomerStore();
  const { getCustomerOrders } = useOrderStore();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const customerOrders = selectedCustomer
    ? getCustomerOrders(selectedCustomer).filter(
        (o) => o.status === 'completed' && o.returnedBuckets < o.quantity
      )
    : [];

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      addReturn({
        customerId: values.customerId,
        orderId: values.orderId,
        quantity: values.quantity,
      });
      message.success('回收登记成功');
      navigate('/bucket');
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <div>
      <PageHeader
        title="登记回收"
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/bucket')}>
            返回列表
          </Button>
        }
      />
      <Card className="border-0 shadow-sm max-w-2xl mx-auto">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="customerId"
            label="选择客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              onChange={(value) => {
                setSelectedCustomer(value);
                form.setFieldsValue({ orderId: undefined });
              }}
              showSearch
              optionFilterProp="children"
            >
              {customers.map((customer: Customer) => (
                <Option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="orderId"
            label="关联订单（可选）"
          >
            <Select
              placeholder="选择关联的订单"
              disabled={!selectedCustomer}
              allowClear
            >
              {customerOrders.map((order: Order) => (
                <Option key={order.id} value={order.id}>
                  #{order.id.slice(-6)} - {order.brand} {order.quantity}桶
                  (已回收{order.returnedBuckets}个)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="quantity"
            label="回收数量"
            rules={[{ required: true, message: '请输入回收数量' }]}
          >
            <InputNumber
              min={1}
              max={100}
              placeholder="请输入回收空桶数量"
              className="w-full"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                确认登记
              </Button>
              <Button onClick={() => navigate('/bucket')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default BucketReturnRecord;
