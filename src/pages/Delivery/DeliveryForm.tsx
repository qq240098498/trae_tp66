import { Form, Input, Select, Button, Space, message } from 'antd';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { DeliveryStaff, DeliveryStaffFormData, DeliveryStaffStatus } from '../../types';

interface DeliveryFormProps {
  initialData?: DeliveryStaff | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DeliveryForm = ({ initialData, onSuccess, onCancel }: DeliveryFormProps) => {
  const [form] = Form.useForm<DeliveryStaffFormData>();
  const { addStaff, updateStaff } = useDeliveryStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (initialData) {
        updateStaff(initialData.id, values);
        message.success('配送员信息更新成功');
      } else {
        addStaff({
          ...values,
          latitude: 39.9042 + (Math.random() - 0.5) * 0.1,
          longitude: 116.4074 + (Math.random() - 0.5) * 0.1,
        });
        message.success('配送员添加成功');
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
      initialValues={initialData || { status: 'idle' as DeliveryStaffStatus }}
    >
      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="name"
          label="配送员姓名"
          rules={[{ required: true, message: '请输入配送员姓名' }]}
        >
          <Input placeholder="请输入配送员姓名" />
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
        name="status"
        label="状态"
        rules={[{ required: true, message: '请选择状态' }]}
      >
        <Select placeholder="请选择状态">
          <Select.Option value="idle">空闲</Select.Option>
          <Select.Option value="delivering">配送中</Select.Option>
          <Select.Option value="offline">离线</Select.Option>
        </Select>
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name="latitude"
          label="纬度"
          rules={[{ required: true, message: '请输入纬度' }]}
        >
          <Input type="number" step="0.0001" placeholder="如：39.9042" />
        </Form.Item>
        <Form.Item
          name="longitude"
          label="经度"
          rules={[{ required: true, message: '请输入经度' }]}
        >
          <Input type="number" step="0.0001" placeholder="如：116.4074" />
        </Form.Item>
      </div>

      <Form.Item className="mb-0">
        <Space className="w-full justify-end">
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {initialData ? '保存修改' : '添加配送员'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default DeliveryForm;
