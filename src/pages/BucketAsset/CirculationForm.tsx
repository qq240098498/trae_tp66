import { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Input, Button, Space, message } from 'antd';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useOrderStore } from '../../stores/orderStore';
import { BucketCirculationType, BucketCirculationFormData } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山', '其他'];

interface CirculationFormProps {
  defaultType?: BucketCirculationType;
  defaultStaffId?: string;
  onSuccess?: (values: BucketCirculationFormData) => void;
  onCancel?: () => void;
}

const CirculationForm = ({ defaultType = 'takeout', defaultStaffId, onSuccess, onCancel }: CirculationFormProps) => {
  const [form] = Form.useForm();
  const { customers } = useCustomerStore();
  const { staffs } = useDeliveryStore();
  const { orders } = useOrderStore();
  const [type, setType] = useState<BucketCirculationType>(defaultType);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(defaultStaffId || null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const customerOrders = selectedCustomer
    ? orders.filter(
        (o) => o.customerId === selectedCustomer && o.status !== 'cancelled'
      )
    : [];

  useEffect(() => {
    form.setFieldsValue({ type: defaultType });
    if (defaultStaffId) {
      form.setFieldsValue({ staffId: defaultStaffId });
      setSelectedStaff(defaultStaffId);
    }
  }, [defaultType, defaultStaffId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSuccess?.(values);
      form.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  const typeDescriptions: Record<BucketCirculationType, string> = {
    takeout: '配送员从水站带出满桶，准备配送',
    sign: '客户签收满桶，确认收货',
    return: '从客户处回收空桶，带回水站',
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ type: defaultType, quantity: 1 }}
    >
      <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
        {typeDescriptions[type]}
      </div>

      <Form.Item
        name="type"
        label="流转类型"
        rules={[{ required: true, message: '请选择流转类型' }]}
      >
        <Select onChange={(value) => setType(value)}>
          <Option value="takeout">带出</Option>
          <Option value="sign">签收</Option>
          <Option value="return">回收</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="staffId"
        label="配送员"
        rules={[{ required: true, message: '请选择配送员' }]}
      >
        <Select
          placeholder="请选择配送员"
          showSearch
          optionFilterProp="children"
          onChange={(value) => setSelectedStaff(value)}
        >
          {staffs.map((staff) => (
            <Option key={staff.id} value={staff.id}>
              {staff.name} - {staff.phone}
            </Option>
          ))}
        </Select>
      </Form.Item>

      {(type === 'sign' || type === 'return') && (
        <>
          <Form.Item
            name="customerId"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <Select
              placeholder="请选择客户"
              showSearch
              optionFilterProp="children"
              onChange={(value) => {
                setSelectedCustomer(value);
                form.setFieldsValue({ orderId: undefined });
              }}
            >
              {customers.map((customer) => (
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
              {customerOrders.map((order) => (
                <Option key={order.id} value={order.id}>
                  #{order.id.slice(-6)} - {order.brand} {order.quantity}桶
                </Option>
              ))}
            </Select>
          </Form.Item>
        </>
      )}

      <Form.Item
        name="brand"
        label="品牌"
        rules={[{ required: true, message: '请选择品牌' }]}
      >
        <Select placeholder="请选择品牌">
          {BRANDS.map((brand) => (
            <Option key={brand} value={brand}>
              {brand}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="quantity"
        label="数量"
        rules={[{ required: true, message: '请输入数量' }]}
      >
        <InputNumber
          min={1}
          max={100}
          className="w-full"
          placeholder="请输入桶的数量"
        />
      </Form.Item>

      <Form.Item
        name="remark"
        label="备注"
      >
        <TextArea rows={3} placeholder="请输入备注信息（可选）" />
      </Form.Item>

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            确认登记
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default CirculationForm;
