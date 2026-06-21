import { useState } from 'react';
import { Form, InputNumber, Button, Card, message, Popconfirm, Space, Divider } from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { useSystemConfigStore } from '../../stores/systemConfigStore';
import { SystemConfigFormData } from '../../types';

const SystemConfig = () => {
  const [form] = Form.useForm<SystemConfigFormData>();
  const { config, updateConfig, resetConfig } = useSystemConfigStore();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      updateConfig(values);
      setTimeout(() => {
        setLoading(false);
        message.success('配置保存成功');
      }, 300);
    } catch {
      // 表单验证失败
    }
  };

  const handleReset = () => {
    resetConfig();
    form.setFieldsValue({
      unitPrice: 20,
      floorFeeRate: 2,
      freeFloorThreshold: 3,
    });
    message.success('已恢复默认配置');
  };

  return (
    <div>
      <PageHeader title="系统配置" breadcrumbs={[{ title: '系统配置', path: '/system/config' }]} />
      <Card className="border-0 shadow-sm max-w-2xl mx-auto">
        <h3 className="font-medium text-gray-800 mb-4">计价配置</h3>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            unitPrice: config.unitPrice,
            floorFeeRate: config.floorFeeRate,
            freeFloorThreshold: config.freeFloorThreshold,
          }}
        >
          <Form.Item
            name="unitPrice"
            label="商品单价（元/桶）"
            rules={[
              { required: true, message: '请输入商品单价' },
              { type: 'number', min: 0.01, message: '单价必须大于0' },
            ]}
          >
            <InputNumber min={0.01} step={0.5} className="w-full" />
          </Form.Item>

          <Form.Item
            name="floorFeeRate"
            label="爬楼费单价（元/层）"
            rules={[
              { required: true, message: '请输入爬楼费单价' },
              { type: 'number', min: 0, message: '单价不能小于0' },
            ]}
          >
            <InputNumber min={0} step={0.5} className="w-full" />
          </Form.Item>

          <Form.Item
            name="freeFloorThreshold"
            label="免费楼层阈值（层）"
            rules={[
              { required: true, message: '请输入免费楼层阈值' },
              { type: 'number', min: 0, message: '楼层阈值不能小于0' },
            ]}
            extra="超过此楼层且无电梯时，开始计算爬楼费"
          >
            <InputNumber min={0} step={1} className="w-full" />
          </Form.Item>

          <Divider />

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Popconfirm
                title="确定要恢复默认配置吗？"
                description="商品单价 ¥20/桶，爬楼费 ¥2/层，3层及以下免费"
                onConfirm={handleReset}
                okText="确定"
                cancelText="取消"
              >
                <Button icon={<ReloadOutlined />}>恢复默认</Button>
              </Popconfirm>
              <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSubmit}>
                保存配置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Card size="small" className="mt-6 bg-blue-50 border-blue-100">
          <h4 className="font-medium text-blue-800 mb-2">计价规则说明</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 商品费用 = 商品单价 × 数量</li>
            <li>• 当楼层 ＞ 免费楼层阈值 且 客户无电梯时，收取爬楼费</li>
            <li>• 爬楼费 = (实际楼层 - 免费楼层阈值) × 爬楼费单价 × 数量</li>
            <li>• 总金额 = 商品费用 + 爬楼费</li>
          </ul>
        </Card>
      </Card>
    </div>
  );
};

export default SystemConfig;
