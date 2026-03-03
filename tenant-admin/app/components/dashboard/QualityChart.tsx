'use client';

import { Card, Skeleton, Space, Typography } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import { Button } from 'antd';

const { Text } = Typography;

interface QualityChartProps {
  data?: Array<{ label: string; value: number; color: string }>;
  loading?: boolean;
}

export default function QualityChart({ data, loading }: QualityChartProps) {
  if (loading || !data) {
    return (
      <Card title="Quality" extra={<Button size="small" icon={<SettingOutlined />} />}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  return (
    <Card
      title="Quality"
      extra={<Button size="small" icon={<SettingOutlined />} />}
    >
      <Text type="secondary">Each bar shows the number of bot responses in that group</Text>

      <div className="chart-bars">
        {data.map((bar) => (
          <div key={bar.label} className="chart-bar">
            <div
              className="chart-fill"
              style={{ height: `${bar.value}%`, background: bar.color }}
            />
            <Text type="secondary">{bar.label}</Text>
          </div>
        ))}
      </div>

      <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 12 }}>
        <Button type="primary">Create Article</Button>
      </Space>
    </Card>
  );
}
