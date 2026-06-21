import { Form, Input, InputNumber, Select, Button, Space, message } from 'antd';
import { useCustomerStore } from '../../stores/customerStore';
import { Customer, CustomerFormData } from '../../types';

interface CustomerFormProps {
  initialData?: Customer | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山', '其他'];

const CustomerForm = ({ initialData, onSuccess, onCancel }: CustomerFormProps) => {
  const [form] = Form.useForm<CustomerFormData>();
  const { addCustomer, updateCustomer } = useCustomerStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (initialData) {
        updateCustomer(initialData.id, values);
        message.success('客户信息更新成功');
      } else {
        addCustomer({
          ...values,
          latitude: 39.9042 + (Math.random() - 0.5) * 0.1,
          longitude: 116.4074 + (Math.random() - 0.5) * 0.1,
        });
        message.success('客户添加成功');
      }
      
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
      initialValues={initialData || { emptyBuckets: 0, depositBuckets: 0, preferredBrand: '农夫山泉' }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="name"
          label="客户姓名"
          rules={[{ required: true, message: '请输入客户姓名' }]}
        >
          <Input placeholder="请输入客户姓名" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="联系电话"
          rules={[
            { required: true, message: '请输入联系电话' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
          ]}
        >
          <Input placeholder="请输入联系电话" />
        </Form.Item>
      </div>

      <Form.Item
        name="address"
        label="详细地址"
        rules={[{ required: true, message: '请输入详细地址' }]}
      >
        <Input placeholder="如：阳光小区1号楼2单元" />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="floor"
          label="楼层/门牌号"
          rules={[{ required: true, message: '请输入楼层/门牌号' }]}
        >
          <Input placeholder="如：501" />
        </Form.Item>
        <Form.Item
          name="preferredBrand"
          label="常订品牌"
          rules={[{ required: true, message: '请选择常订品牌' }]}
        >
          <Select placeholder="请选择品牌">
            {BRANDS.map((brand) => (
              <Select.Option key={brand} value={brand}>
                {brand}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="emptyBuckets"
          label="初始空桶数"
          rules={[{ required: true, message: '请输入初始空桶数' }]}
        >
          <InputNumber
            min={0}
            className="w-full"
            placeholder="请输入客户当前持有的空桶数量"
          />
        </Form.Item>

        <Form.Item
          name="depositBuckets"
          label="押桶数量"
          rules={[{ required: true, message: '请输入押桶数量' }]}
        >
          <InputNumber
            min={0}
            className="w-full"
            placeholder="请输入客户押桶的数量"
          />
        </Form.Item>
      </div>

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {initialData ? '保存修改' : '添加客户'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default CustomerForm;
