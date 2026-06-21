import { ReactNode } from 'react';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ title: string; path?: string }>;
  extra?: ReactNode;
}

export const PageHeader = ({ title, breadcrumbs = [], extra }: PageHeaderProps) => {
  const items = [
    {
      title: (
        <Link to="/">
          <HomeOutlined />
          <span className="ml-1">首页</span>
        </Link>
      ),
    },
    ...breadcrumbs.map((b) => ({
      title: b.path ? <Link to={b.path}>{b.title}</Link> : b.title,
    })),
    { title: <span className="font-medium text-gray-700">{title}</span> },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb items={items} className="mb-2" />
          <h1 className="text-2xl font-bold text-gray-800 m-0">{title}</h1>
        </div>
        {extra}
      </div>
    </div>
  );
};
