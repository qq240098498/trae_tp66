import { Card } from 'antd';
import { ReactNode } from 'react';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { cn } from '../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorMap = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-emerald-600',
  orange: 'from-orange-500 to-orange-600',
  purple: 'from-violet-500 to-violet-600',
};

export const StatCard = ({
  title,
  value,
  icon,
  trend,
  trendLabel = '较昨日',
  color = 'blue',
}: StatCardProps) => {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mb-2">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {trend >= 0 ? (
                <ArrowUpOutlined className="text-emerald-500" />
              ) : (
                <ArrowDownOutlined className="text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm',
                  trend >= 0 ? 'text-emerald-500' : 'text-red-500'
                )}
              >
                {Math.abs(trend)}%
              </span>
              <span className="text-gray-400 text-sm">{trendLabel}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white',
            colorMap[color]
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
};
