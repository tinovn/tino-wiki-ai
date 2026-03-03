'use client';

import { Card, List, Switch, Tag, Typography, Space, Badge } from 'antd';
import { CloudOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';

const { Text } = Typography;

// Static connectors since backend doesn't have MCP endpoints yet
type ConnectorStatus = 'up' | 'down' | 'unknown';
interface Connector { id: number; name: string; status: ConnectorStatus; type: string; }

const connectors: Connector[] = [
  { id: 1, name: 'PostgreSQL', status: 'up', type: 'Database' },
  { id: 2, name: 'Redis', status: 'up', type: 'Cache' },
  { id: 3, name: 'Qdrant', status: 'up', type: 'Vector DB' },
  { id: 4, name: 'vLLM', status: 'up', type: 'LLM Provider' },
];

export default function McpConnectionsPage() {
  const activeCount = connectors.filter((c) => c.status === 'up').length;
  const errorCount = connectors.filter((c) => c.status === 'down').length;

  const stats = [
    { title: 'Active', value: activeCount, icon: <CheckCircleOutlined /> },
    { title: 'Errors', value: errorCount, icon: <WarningOutlined /> },
    { title: 'Total', value: connectors.length, icon: <CloudOutlined /> },
    { title: 'Latency', value: '-', icon: <ClockCircleOutlined /> },
  ];

  return (
    <>
      <PageHeader title="MCP Connections" subtitle="Service connectors and integrations" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </section>

      <section>
        <Card>
          <List
            dataSource={connectors}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Switch key="toggle" checked={item.status === 'up'} />,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Badge status={item.status === 'up' ? 'success' : 'error'} />
                      {item.name}
                    </Space>
                  }
                  description={item.type}
                />
                <Tag color={item.status === 'up' ? 'green' : 'red'}>
                  {item.status === 'up' ? 'Connected' : 'Disconnected'}
                </Tag>
              </List.Item>
            )}
          />
        </Card>
      </section>
    </>
  );
}
