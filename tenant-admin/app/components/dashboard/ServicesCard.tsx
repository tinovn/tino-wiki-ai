'use client';

import { Card, List, Skeleton, Tag, Typography } from 'antd';

const { Text } = Typography;

interface ServicesCardProps {
  services?: Array<{ name: string; status: 'up' | 'down' | 'unknown' }>;
  loading?: boolean;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  up: { color: 'green', label: 'Normal' },
  down: { color: 'red', label: 'Down' },
  unknown: { color: 'default', label: 'Unknown' },
};

export default function ServicesCard({ services, loading }: ServicesCardProps) {
  return (
    <Card title="Service Status" size="small">
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <List
          dataSource={services ?? []}
          renderItem={(service) => {
            const config = statusConfig[service.status] ?? statusConfig.unknown;
            return (
              <List.Item
                actions={[
                  <Tag color={config.color} key={service.name}>
                    {config.label}
                  </Tag>,
                ]}
              >
                <List.Item.Meta
                  title={service.name}
                  description={<Text type="secondary">{service.name}</Text>}
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
