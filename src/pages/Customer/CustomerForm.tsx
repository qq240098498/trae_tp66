import { useEffect } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, message, Switch, Card, Row, Col } from 'antd';
import { useCustomerStore } from '../../stores/customerStore';
import { Customer, CustomerFormData, DELIVERY_TIME_WINDOWS } from '../../types';
import { dayjs } from '../../utils/date';

interface CustomerFormProps {
  initialData?: Customer | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山', '其他'];

interface FormValues extends CustomerFormData {
  recurringEnabled?: boolean;
  recurringIntervalDays?: number;
  recurringQuantity?: number;
  recurringTimeWindow?: any;
  recurringBrand?: string;
}

const CustomerForm = ({ initialData, onSuccess, onCancel }: CustomerFormProps) => {
  const [form] = Form.useForm<FormValues>();
  const { addCustomer, updateCustomer } = useCustomerStore();
  const recurringEnabled = Form.useWatch('recurringEnabled', form);
  const preferredBrand = Form.useWatch('preferredBrand', form);

  useEffect(() => {
    if (preferredBrand && !initialData?.recurringSchedule?.brand) {
      form.setFieldsValue({ recurringBrand: preferredBrand });
    }
  }, [preferredBrand, form, initialData]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const recurringSchedule = values.recurringEnabled
        ? {
            enabled: true,
            brand: values.recurringBrand || values.preferredBrand || '农夫山泉',
            intervalDays: values.recurringIntervalDays || 3,
            quantity: values.recurringQuantity || 2,
            preferredTimeWindow: values.recurringTimeWindow || '14:00-16:00',
            lastOrderDate: initialData?.recurringSchedule?.lastOrderDate,
            nextOrderDate: initialData?.recurringSchedule?.nextOrderDate 
              || dayjs().add(values.recurringIntervalDays || 3, 'day').toISOString(),
          }
        : initialData?.recurringSchedule?.enabled
        ? { ...initialData.recurringSchedule, enabled: false }
        : undefined;

      const { recurringEnabled, recurringIntervalDays, recurringQuantity, recurringTimeWindow, recurringBrand, ...customerData } = values;

      if (initialData) {
        updateCustomer(initialData.id, { ...customerData, recurringSchedule });
        message.success('客户信息更新成功');
      } else {
        addCustomer({
          ...customerData,
          recurringSchedule,
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
      initialValues={
        initialData
          ? {
              ...initialData,
              recurringEnabled: initialData.recurringSchedule?.enabled || false,
              recurringBrand: initialData.recurringSchedule?.brand || initialData.preferredBrand,
              recurringIntervalDays: initialData.recurringSchedule?.intervalDays || 3,
              recurringQuantity: initialData.recurringSchedule?.quantity || 2,
              recurringTimeWindow: initialData.recurringSchedule?.preferredTimeWindow || '14:00-16:00',
            }
          : { emptyBuckets: 0, depositBuckets: 0, preferredBrand: '农夫山泉', recurringEnabled: false, recurringBrand: '农夫山泉' }
      }
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

      <Card 
        size="small" 
        className="mb-4 border-dashed"
        title={
          <div className="flex items-center justify-between">
            <span>周期自动下单</span>
            <Form.Item name="recurringEnabled" valuePropName="checked" className="mb-0">
              <Switch />
            </Form.Item>
          </div>
        }
      >
        {recurringEnabled && (
          <div className="space-y-4">
            <Form.Item
              name="recurringBrand"
              label="水品牌"
              rules={[{ required: true, message: '请选择水品牌' }]}
              className="mb-0"
            >
              <Select placeholder="请选择水品牌">
                {BRANDS.map((b) => (
                  <Select.Option key={b} value={b}>
                    {b}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="recurringIntervalDays"
                  label="间隔天数"
                  rules={[{ required: true, message: '请输入间隔天数' }]}
                  className="mb-0"
                >
                  <InputNumber
                    min={1}
                    max={30}
                    className="w-full"
                    placeholder="如：3"
                    addonAfter="天"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="recurringQuantity"
                  label="每次数量"
                  rules={[{ required: true, message: '请输入每次数量' }]}
                  className="mb-0"
                >
                  <InputNumber
                    min={1}
                    max={20}
                    className="w-full"
                    placeholder="如：2"
                    addonAfter="桶"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="recurringTimeWindow"
              label="配送时段"
              rules={[{ required: true, message: '请选择配送时段' }]}
              className="mb-0"
            >
              <Select placeholder="请选择时段">
                {DELIVERY_TIME_WINDOWS.map((tw) => (
                  <Select.Option key={tw} value={tw}>
                    {tw}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        )}
        {!recurringEnabled && (
          <div className="text-gray-400 text-sm text-center py-2">
            开启后系统将按周期自动生成订单并短信确认
          </div>
        )}
      </Card>

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
