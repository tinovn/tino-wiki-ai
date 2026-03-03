'use client';

import { Avatar, Card, Skeleton, Space, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  loading?: boolean;
}

export default function KpiCard({ title, value, icon, loading }: KpiCardProps) {
  return (
    <Card size="small">
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 1 }} title={{ width: 120 }} />
        ) : (
          <Statistic title={title} value={value} />
        )}
        <Avatar size="small">{icon}</Avatar>
      </Space>
    </Card>
  );
}
