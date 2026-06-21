import { useEffect, useMemo } from 'react';
import { Form, Select, InputNumber, Button, Space, message, Card, Descriptions, Tag, Switch, Alert } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { useOrderStore } from '../../stores/orderStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSystemConfigStore } from '../../stores/systemConfigStore';
import { OrderFormData, DELIVERY_TIME_WINDOWS } from '../../types';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { findNearestDeliveryStaff } from '../../utils/distance';
import { calculatePricing, shouldAddFloorFee, parseFloor } from '../../utils/pricing';

const BRANDS = ['农夫山泉', '怡宝', '娃哈哈', '百岁山', '昆仑山'];

const OrderForm = () => {
  const [form] = Form.useForm<OrderFormData>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customerId');
  const { addOrder } = useOrderStore();
  const { customers, getCustomer } = useCustomerStore();
  const { inventories } = useInventoryStore();
  const { config } = useSystemConfigStore();

  const selectedCustomerId = Form.useWatch('customerId', form);
  const quantity = Form.useWatch('quantity', form) || 0;
  const disableFloorFee = Form.useWatch('disableFloorFee', form) || false;

  const selectedCustomer = selectedCustomerId ? getCustomer(selectedCustomerId) : null;

  const pricing = useMemo(() => {
    if (!selectedCustomer || quantity <= 0) {
      return null;
    }
    return calculatePricing({
      customer: selectedCustomer,
      quantity,
      unitPrice: config.unitPrice,
      floorFeeRate: config.floorFeeRate,
      freeFloorThreshold: config.freeFloorThreshold,
      disableFloorFee,
    });
  }, [selectedCustomer, quantity, config, disableFloorFee]);

  const floorFeeInfo = useMemo(() => {
    if (!selectedCustomer) return null;
    const floor = parseFloor(selectedCustomer.floor);
    const needsFloorFee = shouldAddFloorFee(selectedCustomer, config.freeFloorThreshold);
    return {
      floor,
      needsFloorFee,
      hasElevator: selectedCustomer.hasElevator,
    };
  }, [selectedCustomer, config.freeFloorThreshold]);

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

          <Form.Item
            name="disableFloorFee"
            label="免除爬楼费"
            valuePropName="checked"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>

          {pricing && (
            <Card size="small" className="mb-4 bg-gray-50 border-dashed">
              <h4 className="font-medium text-gray-800 mb-3">费用明细</h4>
              {disableFloorFee && (
                <Alert
                  message="已手动免除爬楼费"
                  type="info"
                  showIcon
                  className="mb-3"
                />
              )}
              <Descriptions column={2} size="small">
                <Descriptions.Item label="商品单价">
                  ¥{pricing.unitPrice}/桶
                </Descriptions.Item>
                <Descriptions.Item label="商品费用">
                  ¥{pricing.unitPrice * quantity}
                </Descriptions.Item>
                <Descriptions.Item label="楼层信息">
                  <span className={floorFeeInfo?.needsFloorFee ? 'text-orange-600' : 'text-gray-600'}>
                    {floorFeeInfo?.floor}层
                    {floorFeeInfo?.hasElevator ? ' (有电梯)' : ' (无电梯)'}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="爬楼费">
                  {disableFloorFee ? (
                    <Tag color="blue">手动免除</Tag>
                  ) : pricing.floorFee > 0 ? (
                    <span className="text-orange-600 font-medium">
                      +¥{pricing.floorFee}
                      <Tag color="orange" className="ml-2">
                        {parseFloor(selectedCustomer!.floor) - config.freeFloorThreshold}层 × ¥{pricing.floorFeeRate}/层 × {quantity}桶
                      </Tag>
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      {floorFeeInfo?.needsFloorFee 
                        ? '需收取' 
                        : floorFeeInfo?.hasElevator 
                          ? '免爬楼费（有电梯）' 
                          : `免爬楼费（${config.freeFloorThreshold}层及以下）`}
                    </span>
                  )}
                </Descriptions.Item>
              </Descriptions>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-gray-600">合计金额</span>
                <span className="text-2xl font-bold text-blue-600">
                  ¥{pricing.totalAmount}
                </span>
              </div>
            </Card>
          )}

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
