import { Card, Button, List, Tag, Alert } from 'antd';
import {
  FileTextOutlined,
  TruckOutlined,
  ReloadOutlined,
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  RightOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { StatCard } from '../../components/StatCard';
import { useOrderStore } from '../../stores/orderStore';
import { useDeliveryStore } from '../../stores/deliveryStore';
import { useBucketStore } from '../../stores/bucketStore';
import { useInventoryStore, getBatchRemainingDays, computeBatchStatus } from '../../stores/inventoryStore';
import { useCustomerStore } from '../../stores/customerStore';
import { useRecurringOrderStore } from '../../stores/recurringOrderStore';
import { formatDateTime, dayjs } from '../../utils/date';

const Dashboard = () => {
  const navigate = useNavigate();
  const { orders, getTodayOrders, getOrdersByStatus } = useOrderStore();
  const { staffs, getStaffDeliveries } = useDeliveryStore();
  const { getTodayReturns } = useBucketStore();
  const { inventories, getApproachingBatches, getDiscountBatches, getExpiredBatches } = useInventoryStore();
  const { getCustomer } = useCustomerStore();
  const { getPendingOrdersByStatus } = useRecurringOrderStore();

  const approachingBatches = getApproachingBatches();
  const discountBatches = getDiscountBatches();
  const expiredBatches = getExpiredBatches();
  const approachingCount = approachingBatches.reduce((sum, b) => sum + b.quantity, 0);
  const discountCount = discountBatches.reduce((sum, b) => sum + b.quantity, 0);
  const expiredCount = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);

  const todayOrders = getTodayOrders();
  const deliveringOrders = getOrdersByStatus('delivering');
  const pendingOrders = getOrdersByStatus('pending');
  const assignedOrders = getOrdersByStatus('assigned');
  const todayReturns = getTodayReturns();
  const pendingSmsOrders = getPendingOrdersByStatus('pending_sms');

  const pendingEmptyBuckets = orders.reduce((sum, order) => {
    if (order.status === 'completed' && order.returnedBuckets < order.quantity) {
      return sum + (order.quantity - order.returnedBuckets);
    }
    return sum;
  }, 0);

  const todayRevenue = orders
    .filter((o) => dayjs(o.createdAt).isSame(dayjs(), 'day') && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || o.quantity * 20), 0);

  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().subtract(6 - i, 'day');
    const dayOrders = orders.filter(
      (o) =>
        dayjs(o.createdAt).isSame(date, 'day') &&
        (o.status === 'delivering' || o.status === 'completed')
    );
    return {
      date: date.format('MM/DD'),
      配送量: dayOrders.reduce((sum, o) => sum + o.deliveredBuckets, 0),
      订单数: dayOrders.length,
    };
  });

  const brandSalesData = inventories.map((inv) => {
    const brandOrders = orders.filter(
      (o) =>
        o.brand === inv.brand &&
        (o.status === 'delivering' || o.status === 'completed')
    );
    return {
      name: inv.brand,
      value: brandOrders.reduce((sum, o) => sum + o.deliveredBuckets, 0),
    };
  });

  const staffPerformanceData = staffs.map((staff) => {
    const deliveries = getStaffDeliveries(staff.id).filter(
      (d) => d.status === 'delivered'
    );
    return {
      name: staff.name,
      配送量: deliveries.length,
    };
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

  const todoItems = [
    ...pendingSmsOrders.slice(0, 2).map((order) => ({
      id: order.id,
      type: 'pending_sms' as const,
      title: `待确认 - ${getCustomer(order.customerId)?.name}`,
      customer: getCustomer(order.customerId)?.name,
      time: order.smsSentAt,
      quantity: order.quantity,
      brand: order.brand,
    })),
    ...pendingOrders.slice(0, 3).map((order) => ({
      id: order.id,
      type: 'pending' as const,
      title: `待派单 - #${order.id.slice(-6)}`,
      customer: getCustomer(order.customerId)?.name,
      time: order.createdAt,
      quantity: order.quantity,
      brand: order.brand,
    })),
    ...assignedOrders.slice(0, 2).map((order) => ({
      id: order.id,
      type: 'assigned' as const,
      title: `待配送 - #${order.id.slice(-6)}`,
      customer: getCustomer(order.customerId)?.name,
      time: order.createdAt,
      quantity: order.quantity,
      brand: order.brand,
    })),
  ].slice(0, 5);

  return (
    <div className="space-y-6">
      {(approachingCount > 0 || discountCount > 0 || expiredCount > 0) && (
        <Alert
          message="库存预警"
          description={
            <div className="space-y-1">
              {approachingCount > 0 && (
                <div>
                  <WarningOutlined className="text-orange-500 mr-2" />
                  有 <strong className="text-orange-600">{approachingCount}</strong> 桶临期水（超过2个月），请优先出货或降价处理
                </div>
              )}
              {discountCount > 0 && (
                <div>
                  <ThunderboltOutlined className="text-blue-500 mr-2" />
                  有 <strong className="text-blue-600">{discountCount}</strong> 桶已标记降价促销
                </div>
              )}
              {expiredCount > 0 && (
                <div>
                  <ExclamationCircleOutlined className="text-red-500 mr-2" />
                  有 <strong className="text-red-600">{expiredCount}</strong> 桶已过期，请及时报废处理
                </div>
              )}
            </div>
          }
          type={expiredCount > 0 ? 'error' : approachingCount > 0 ? 'warning' : 'info'}
          showIcon
          closable
          action={
            <Button size="small" type="primary" onClick={() => navigate('/inventory')}>
              去处理
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="今日订单"
          value={todayOrders.length}
          icon={<FileTextOutlined />}
          trend={12}
          color="blue"
        />
        <StatCard
          title="配送中"
          value={deliveringOrders.length}
          icon={<TruckOutlined />}
          trend={5}
          color="green"
        />
        <StatCard
          title="待回收空桶"
          value={pendingEmptyBuckets}
          icon={<ReloadOutlined />}
          trend={-3}
          color="orange"
        />
        <StatCard
          title="今日营业额"
          value={`¥${todayRevenue.toLocaleString()}`}
          icon={<DollarOutlined />}
          trend={8}
          color="purple"
        />
        {approachingCount > 0 && (
          <StatCard
            title="临期水库存"
            value={approachingCount}
            icon={<WarningOutlined />}
            color="orange"
            onClick={() => navigate('/inventory')}
            className="cursor-pointer"
          />
        )}
        {discountCount > 0 && (
          <StatCard
            title="降价促销"
            value={discountCount}
            icon={<ThunderboltOutlined />}
            color="blue"
            onClick={() => navigate('/inventory')}
            className="cursor-pointer"
          />
        )}
        {pendingSmsOrders.length > 0 && (
          <StatCard
            title="待确认订单"
            value={pendingSmsOrders.length}
            icon={<MessageOutlined />}
            color="red"
            onClick={() => navigate('/recurring-order')}
            className="cursor-pointer"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(approachingBatches.length > 0 || discountBatches.length > 0 || expiredBatches.length > 0) && (
          <Card
            title={
              <span className="flex items-center gap-2">
                <WarningOutlined className="text-orange-500" />
                临期/降价批次
              </span>
            }
            className="border-0 shadow-sm"
            extra={
              <Button type="link" onClick={() => navigate('/inventory')}>
                查看全部 <RightOutlined />
              </Button>
            }
          >
            <List
              dataSource={[...expiredBatches, ...discountBatches, ...approachingBatches].slice(0, 5)}
              renderItem={(batch) => {
                const remainingDays = getBatchRemainingDays(batch.productionDate);
                const status = computeBatchStatus(batch);
                return (
                  <List.Item className="px-2 -mx-2 py-2">
                    <List.Item.Meta
                      title={
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">
                            {batch.brand} - {batch.batchNo}
                          </span>
                          <Tag
                            color={
                              status === 'expired' ? 'red' :
                              status === 'discount' ? 'blue' : 'orange'
                            }
                          >
                            {status === 'expired' ? '已过期' :
                             status === 'discount' ? `降价¥${batch.discountPrice}` :
                             remainingDays <= 0 ? '即将过期' : `剩${remainingDays}天`}
                          </Tag>
                        </div>
                      }
                      description={
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">
                            生产日期：{dayjs(batch.productionDate).format('YYYY-MM-DD')} · 库存：{batch.quantity}桶
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        )}

        <Card
          title="待办事项"
          className="border-0 shadow-sm"
          extra={
            <Button type="link" onClick={() => navigate('/order')}>
              查看全部 <RightOutlined />
            </Button>
          }
        >
          {todoItems.length > 0 ? (
            <List
              dataSource={todoItems}
              renderItem={(item) => (
                <List.Item
                  className="cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2"
                  onClick={() => {
                    if (item.type === 'pending_sms') {
                      navigate('/recurring-order');
                    } else {
                      navigate(`/order/${item.id}`);
                    }
                  }}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {item.title}
                        </span>
                        <Tag
                          color={
                            item.type === 'pending_sms' ? 'red' :
                            item.type === 'pending' ? 'orange' : 'blue'
                          }
                        >
                          {item.type === 'pending_sms' ? '待确认' :
                           item.type === 'pending' ? '待派单' : '已派单'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">
                          {item.customer} - {item.brand} {item.quantity}桶
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <ClockCircleOutlined />
                          {formatDateTime(item.time)}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div className="text-center py-8 text-gray-400">
              暂无待办事项
            </div>
          )}
        </Card>

        <Card
          title="快速操作"
          className="border-0 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/order/new')}
              className="h-20 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">快速开单</span>
            </Button>
            <Button
              size="large"
              icon={<EditOutlined />}
              onClick={() => navigate('/bucket/record')}
              className="h-20 flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">登记回收</span>
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">今日概览</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {todayOrders.length}
                </div>
                <div className="text-xs text-blue-600">今日订单</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600">
                  {todayReturns.length}
                </div>
                <div className="text-xs text-emerald-600">今日回收</div>
              </div>
            </div>
          </div>
        </Card>

        <Card
          title="品牌销量占比"
          className="border-0 shadow-sm"
        >
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={brandSalesData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {brandSalesData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="最近7天配送量趋势"
          className="border-0 shadow-sm"
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={last7DaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Line
                type="monotone"
                dataKey="配送量"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="订单数"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card
          title="配送员业绩排名"
          className="border-0 shadow-sm"
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={staffPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="配送量" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
