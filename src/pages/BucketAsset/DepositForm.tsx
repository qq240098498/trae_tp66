import { useState, useEffect } from 'react';
import { Form, Select, InputNumber, Input, Button, Space, message } from 'antd';
import { useCustomerStore } from '../../stores/customerStore';
import { BUCKET_DEPOSIT_PRICE, DepositActionType } from '../../types';

const { Option } = Select;
const { TextArea } = Input;

interface DepositFormProps {
  initialCustomerId?: string;
  initialActionType?: DepositActionType;
  onSuccess?: (values: any) => void;
  onCancel?: () => void;
}

const DepositForm = ({ initialCustomerId, initialActionType = 'deposit', onSuccess, onCancel }: DepositFormProps) => {
  const [form] = Form.useForm();
  const { customers, getCustomer } = useCustomerStore();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(initialCustomerId || null);
  const [actionType, setActionType] = useState<DepositActionType>(initialActionType);
  const [quantity, setQuantity] = useState<number>(1);

  const customer = selectedCustomer ? getCustomer(selectedCustomer) : null;
  const maxRefund = customer?.depositBuckets || 0;
  const totalAmount = quantity * BUCKET_DEPOSIT_PRICE;

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomer(initialCustomerId);
      form.setFieldsValue({ customerId: initialCustomerId });
    }
    form.setFieldsValue({ actionType: initialActionType, quantity: 1 });
  }, [initialCustomerId, initialActionType, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (values.actionType === 'refund' && customer && values.quantity > customer.depositBuckets) {
        message.error(`退桶数量不能超过当前押桶数（${customer.depositBuckets}个）`);
        return;
      }

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
      initialValues={{ actionType: initialActionType, quantity: 1 }}
    >
      <Form.Item
        name="actionType"
        label="登记类型"
        rules={[{ required: true, message: '请选择登记类型' }]}
      >
        <Select onChange={(value) => setActionType(value)}>
          <Option value="deposit">押桶</Option>
          <Option value="refund">退桶</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="customerId"
        label="选择客户"
        rules={[{ required: true, message: '请选择客户' }]}
      >
        <Select
          placeholder="请选择客户"
          showSearch
          optionFilterProp="children"
          onChange={(value) => setSelectedCustomer(value)}
        >
          {customers.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.name} - {c.phone} (押桶: {c.depositBuckets}个)
            </Option>
          ))}
        </Select>
      </Form.Item>

      {customer && actionType === 'refund' && (
        <div className="mb-4 p-3 bg-orange-50 rounded-lg text-sm text-orange-700">
          当前押桶数：<span className="font-bold">{customer.depositBuckets}</span> 个，最多可退 <span className="font-bold">{customer.depositBuckets}</span> 个
        </div>
      )}

      <Form.Item
        name="quantity"
        label={`${actionType === 'deposit' ? '押桶' : '退桶'}数量`}
        rules={[
          { required: true, message: '请输入数量' },
          { type: 'number', min: 1, message: '数量必须为大于0的整数' },
        ]}
      >
        <InputNumber
          min={1}
          max={actionType === 'refund' ? maxRefund : 100}
          precision={0}
          className="w-full"
          placeholder={`请输入${actionType === 'deposit' ? '押桶' : '退桶'}数量`}
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

      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">单价：</span>
          <span>¥{BUCKET_DEPOSIT_PRICE}/个</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-gray-600">数量：</span>
          <span>{quantity} 个</span>
        </div>
        <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-700">{actionType === 'deposit' ? '应收押金' : '应退押金'}：</span>
          <span className={actionType === 'deposit' ? 'text-green-600' : 'text-red-600'}>
            {actionType === 'deposit' ? '+' : '-'}¥{totalAmount}
          </span>
        </div>
      </div>

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
            确认{actionType === 'deposit' ? '押桶' : '退桶'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DepositForm;
