import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  FileTextOutlined,
  TruckOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '工作台',
  },
  {
    key: '/customer',
    icon: <TeamOutlined />,
    label: '客户管理',
  },
  {
    key: '/order',
    icon: <FileTextOutlined />,
    label: '订单管理',
  },
  {
    key: '/delivery',
    icon: <TruckOutlined />,
    label: '配送管理',
  },
  {
    key: '/bucket',
    icon: <ReloadOutlined />,
    label: '空桶回收',
  },
  {
    key: '/inventory',
    icon: <DatabaseOutlined />,
    label: '水桶资产',
  },
  {
    key: '/reconciliation',
    icon: <BarChartOutlined />,
    label: '对账中心',
  },
];

export const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = menuItems
    .map((item) => item.key)
    .find((key) => location.pathname.startsWith(key)) || '/';

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: '退出登录',
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="light"
        className="border-r border-gray-100"
        width={240}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">水</span>
            </div>
            {!collapsed && (
              <span className="font-bold text-lg text-blue-800">水站管理系统</span>
            )}
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none mt-2"
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b border-gray-100 h-16 px-6 flex items-center justify-between">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-600 hover:text-blue-600 transition-colors"
          >
            {collapsed ? <MenuUnfoldOutlined size={20} /> : <MenuFoldOutlined size={20} />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">管理员</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                icon={<UserOutlined />}
                className="bg-blue-600 cursor-pointer"
              />
            </Dropdown>
          </div>
        </Header>
        <Content
          className={cn(
            'bg-sky-50/50 p-6 overflow-auto',
            'transition-all duration-300'
          )}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
