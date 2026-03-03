'use client';

import { Card, Progress, Skeleton, Space, Typography } from 'antd';
import type { ConfidenceRange } from '@/types/analytics';

const { Text } = Typography;

interface ConfidenceCardProps {
  data?: ConfidenceRange[];
  loading?: boolean;
}

export default function ConfidenceCard({ data, loading }: ConfidenceCardProps) {
  if (loading || !data) {
    return (
      <Card title="Độ tin cậy" size="small">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <Card title="Độ tin cậy" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {data.map((range) => {
          const pct = Math.round((range.count / total) * 100);
          return (
            <div key={range.range}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 13 }}>{range.range}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{range.count} ({pct}%)</Text>
              </div>
              <Progress
                percent={pct}
                showInfo={false}
                strokeColor={range.color}
                size="small"
              />
            </div>
          );
        })}
      </Space>
    </Card>
  );
}
