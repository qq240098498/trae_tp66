import { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Input, Button, Space, Radio } from 'antd';
import { useCustomerStore } from '../../stores/customerStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { BucketDamageType, BUCKET_DAMAGE_PRICE } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山', '其他'];

interface DamageFormProps {
  defaultType?: BucketDamageType;
  onSuccess?: (values: any) => void;
  onCancel?: () => void;
}

const DamageForm = ({ defaultType = 'damage', onSuccess, onCancel }: DamageFormProps) => {
  const [form] = Form.useForm();
  const { customers } = useCustomerStore();
  const { staffs } = useDeliveryStore();
  const [type, setType] = useState<BucketDamageType>(defaultType);
  const [chargeTo, setChargeTo] = useState<'staff' | 'customer'>('staff');
  const [quantity, setQuantity] = useState<number>(1);
  const [chargedAmount, setChargedAmount] = useState<number>(0);

  const totalAmount = quantity * BUCKET_DAMAGE_PRICE;

  useEffect(() => {
    form.setFieldsValue({ type: defaultType, quantity: 1, chargeTo: 'staff', chargedAmount: 0 });
  }, [defaultType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSuccess?.(values);
      form.resetFields();
    } catch {
      // 表单验证失败
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{ type: defaultType, quantity: 1, chargeTo: 'staff', chargedAmount: 0 }}
    >
      <div className="mb-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
        桶损/丢失赔偿单价：<span className="font-bold">¥{BUCKET_DAMAGE_PRICE}/个</span>
      </div>

      <Form.Item
        name="type"
        label="类型"
        rules={[{ required: true, message: '请选择类型' }]}
      >
        <Select onChange={(value) => setType(value)}>
          <Option value="damage">损坏</Option>
          <Option value="lost">丢失</Option>
        </Select>
      </Form.Item>

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
        rules={[
          { required: true, message: '请输入数量' },
          { type: 'number', min: 1, message: '数量必须为大于0的整数' },
        ]}
      >
        <InputNumber
          min={1}
          max={100}
          precision={0}
          className="w-full"
          placeholder="请输入桶的数量"
          onKeyDown={(e) => {
            if (['-', '+', '.', 'e', 'E'].includes(e.key)) {
              e.preventDefault();
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (/[^\d]/.test(text)) {
              e.preventDefault();
            }
          }}
          onChange={(value) => setQuantity(value || 1)}
        />
      </Form.Item>

      <Form.Item
        name="chargeTo"
        label="责任方"
        rules={[{ required: true, message: '请选择责任方' }]}
      >
          <Radio.Group onChange={(e) => setChargeTo(e.target.value)}>
            <Radio value="staff">配送员</Radio>
            <Radio value="customer">客户</Radio>
          </Radio.Group>
        </Form.Item>

      {chargeTo === 'staff' && (
        <Form.Item
          name="staffId"
          label="配送员"
          rules={[{ required: true, message: '请选择配送员' }]}
        >
          <Select placeholder="请选择配送员" showSearch optionFilterProp="children">
            {staffs.map((staff) => (
              <Option key={staff.id} value={staff.id}>
                {staff.name} - {staff.phone}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      {chargeTo === 'customer' && (
        <Form.Item
          name="customerId"
          label="客户"
          rules={[{ required: true, message: '请选择客户' }]}
        >
          <Select placeholder="请选择客户" showSearch optionFilterProp="children">
            {customers.map((customer) => (
              <Option key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone} (押桶: {customer.depositBuckets}个)
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">赔偿单价：</span>
          <span>¥{BUCKET_DAMAGE_PRICE}/个</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600">数量：</span>
          <span>{quantity} 个</span>
        </div>
        <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-700">应扣金额：</span>
          <span className="text-red-600">¥{totalAmount}</span>
        </div>
      </div>

      <Form.Item
        name="chargedAmount"
        label="已扣金额"
        rules={[{ required: true, message: '请输入已扣金额' }]}
      >
        <InputNumber
          min={0}
          max={totalAmount}
          className="w-full"
          placeholder="请输入实际已扣除的金额"
          onChange={(value) => setChargedAmount(value || 0)}
        />
        <div className="text-xs text-gray-500 mt-1">
          输入0表示未扣费，输入{totalAmount}表示全额扣费</div>
        </Form.Item>

        {chargeTo === 'customer' && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            客户当前押桶：{customers.find(c => c.id === form.getFieldValue('customerId'))?.depositBuckets || 0}个，
            押金 ¥{(customers.find(c => c.id === form.getFieldValue('customerId'))?.depositBuckets || 0) * BUCKET_DAMAGE_PRICE}元
          </div>
        )}

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

export default DamageForm;
