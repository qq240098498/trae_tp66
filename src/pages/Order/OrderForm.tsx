import { useEffect } from 'react';
import { Form, Select, InputNumber, Button, Space, message, Card } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { OrderFormData, DELIVERY_TIME_WINDOWS } from '../../types';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { findNearestDeliveryStaff } from '../../utils/distance';

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山'];

const OrderForm = () => {
  const [form] = Form.useForm<OrderFormData>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');
  const { addOrder } = useOrderStore();
  const { customers, getCustomer } = useCustomerStore();
  const { inventories } = useInventoryStore();

  useEffect(() => {
    if (customerId) {
      const customer = getCustomer(customerId);
      if (customer) {
        form.setFieldsValue({
          customerId,
          brand: customer.preferredBrand,
        });
      }
    }
  }, [customerId, form, getCustomer]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const inventory = inventories.find((i) => i.brand === values.brand);
      if (inventory && inventory.fullBuckets < values.quantity) {
        message.error(`${values.brand} 库存不足，当前库存：${inventory.fullBuckets} 桶`);
        return;
      }

      const { autoAssigned } = addOrder(values);

      if (autoAssigned) {
        message.success('订单创建成功，已自动匹配配送员');
      } else {
        message.warning('订单创建成功，但未找到可用配送员，请手动分配');
      }

      navigate('/order');
    } catch {
      // 表单验证失败
    }
  };

  return (
    <div>
      <PageHeader
        title="新增订单"
        breadcrumbs={[{ title: '订单管理', path: '/order' }]}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/order')}>
            返回列表
          </Button>
        }
      />
      <Card className="border-0 shadow-sm max-w-2xl mx-auto">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ quantity: 1, deliveryTimeWindow: DELIVERY_TIME_WINDOWS[0] }}
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

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="brand"
              label="品牌"
              rules={[{ required: true, message: '请选择品牌' }]}
            >
              <Select placeholder="请选择品牌">
                {BRANDS.map((brand) => {
                  const inv = inventories.find((i) => i.brand === brand);
                  return (
                    <Select.Option key={brand} value={brand}>
                      {brand} {inv ? `(库存: ${inv.fullBuckets}桶)` : ''}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
            <Form.Item
              name="quantity"
              label="数量（桶）"
              rules={[{ required: true, message: '请输入数量' }]}
            >
              <InputNumber min={1} max={50} className="w-full" />
            </Form.Item>
          </div>

          <Form.Item
            name="deliveryTimeWindow"
            label="配送时间窗口"
            rules={[{ required: true, message: '请选择配送时间' }]}
          >
            <Select placeholder="请选择配送时间">
              {DELIVERY_TIME_WINDOWS.map((window) => (
                <Select.Option key={window} value={window}>
                  {window}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => navigate('/order')}>取消</Button>
              <Button type="primary" onClick={handleSubmit}>
                创建订单
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default OrderForm;
