import { useState } from 'react';
import { Card, Button, Modal, List, Avatar, Tag, Empty } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { useCustomerStore } from '../../stores/customerStore';
import { useOrderStore } from '../../stores/orderStore';
import { useBucketStore } from '../../stores/bucketStore';
import BucketReturnForm from './BucketReturnForm';

const BucketReturnList = () => {
  const { customers, getCustomer } = useCustomerStore();
  const { getOrder } = useOrderStore();
  const { getTodayReturns } = useBucketStore();
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [initialCustomerId, setInitialCustomerId] = useState<string | undefined>();
  const [initialOrderId, setInitialOrderId] = useState<string | undefined>();

  const todayReturns = getTodayReturns();
  const totalTodayQuantity = todayReturns.reduce((sum, r) => sum + r.quantity, 0);

  const handleQuickAdd = (customerId: string) => {
    setInitialCustomerId(customerId);
    setInitialOrderId(undefined);
    setFormModalVisible(true);
  };

  const handleAddNew = () => {
    setInitialCustomerId(undefined);
    setInitialOrderId(undefined);
    setFormModalVisible(true);
  };

  const customersWithBuckets = customers.filter((c) => c.emptyBuckets > 0);

  return (
    <div>
      <PageHeader
        title="空桶回收登记"
        breadcrumbs={[{ title: '空桶回收' }]}
        extra={
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              今日已回收: <span className="font-semibold text-green-600">{totalTodayQuantity} 桶</span>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNew}>
              新增回收登记
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-6">
        <Card
          title={
            <div className="flex items-center justify-between">
              <span>快速回收</span>
              <Tag color="orange">{customersWithBuckets.length} 位客户有待回收</Tag>
            </div>
          }
          className="border-0 shadow-sm"
        >
          {customersWithBuckets.length === 0 ? (
            <Empty description="暂无待回收空桶的客户" />
          ) : (
            <List
              dataSource={customersWithBuckets}
              renderItem={(customer) => (
                <List.Item
                  key={customer.id}
                  actions={[
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => handleQuickAdd(customer.id)}
                    >
                      登记回收
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <div className="flex items-center gap-2">
                        <span>{customer.name}</span>
                        <Tag color="orange" icon={<InboxOutlined />}>
                          {customer.emptyBuckets} 桶
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <PhoneOutlined /> {customer.phone}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <EnvironmentOutlined /> {customer.address}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          title="今日回收记录"
          className="border-0 shadow-sm"
          extra={<Tag color="green">{todayReturns.length} 笔</Tag>}
        >
          {todayReturns.length === 0 ? (
            <Empty description="今日暂无回收记录" />
          ) : (
            <List
              dataSource={todayReturns.slice().reverse()}
              renderItem={(record) => {
                const customer = getCustomer(record.customerId);
                const order = record.orderId ? getOrder(record.orderId) : null;
                return (
                  <List.Item key={record.id}>
                    <List.Item.Meta
                      title={
                        <div className="flex items-center justify-between">
                          <span className="text-gray-800">{customer?.name}</span>
                          <Tag color="green">+{record.quantity} 桶</Tag>
                        </div>
                      }
                      description={
                        <div className="text-sm text-gray-500">
                          {order && <div>关联订单: #{order.id.slice(-6)}</div>}
                          <div>{new Date(record.createdAt).toLocaleTimeString()}</div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        <Card
          title="回收统计"
          className="border-0 shadow-sm"
        >
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{totalTodayQuantity}</div>
              <div className="text-sm text-gray-500 mt-1">今日回收桶数</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{todayReturns.length}</div>
              <div className="text-sm text-gray-500 mt-1">今日回收笔数</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {customers.reduce((sum, c) => sum + c.emptyBuckets, 0)}
              </div>
              <div className="text-sm text-gray-500 mt-1">客户持有的空桶总数</div>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title="空桶回收登记"
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <BucketReturnForm
          initialCustomerId={initialCustomerId}
          initialOrderId={initialOrderId}
          onSuccess={() => setFormModalVisible(false)}
          onCancel={() => setFormModalVisible(false)}
        />
      </Modal>
    </div>
  );
};

export default BucketReturnList;
