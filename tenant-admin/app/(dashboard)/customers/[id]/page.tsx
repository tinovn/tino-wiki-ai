'use client';

import { useParams } from 'next/navigation';
import { Card, Tabs, Descriptions, List, Tag, Typography, Space, Empty, Button, App, Spin } from 'antd';
import PageHeader from '@/components/layout/PageHeader';
import {
  useCustomer,
  useCustomerMemories,
  useCustomerConversations,
} from '@/hooks/useCustomers';

const { Text } = Typography;

const memoryTypeColors: Record<string, string> = {
  PREFERENCE: 'blue',
  PRODUCT_INTEREST: 'green',
  ISSUE_HISTORY: 'red',
  NOTE: 'default',
  CONTEXT: 'purple',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: memories, isLoading: memoriesLoading } = useCustomerMemories(customerId);
  const { data: conversations, isLoading: conversationsLoading } = useCustomerConversations(customerId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return <PageHeader title="Customer not found" />;
  }

  const tabItems = [
    {
      key: 'info',
      label: 'Info',
      children: (
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Name">{customer.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{customer.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Phone">{customer.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="External ID">{customer.externalId || '-'}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(customer.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Updated">
            {new Date(customer.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'memories',
      label: `Memories (${memories?.length ?? 0})`,
      children: (
        <List
          loading={memoriesLoading}
          dataSource={memories ?? []}
          locale={{ emptyText: <Empty description="No memories yet" /> }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Tag color={memoryTypeColors[item.type]}>{item.type}</Tag>
                    <Text strong>{item.key}</Text>
                  </Space>
                }
                description={
                  <Space direction="vertical">
                    <Text>{item.value}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Source: {item.source} | Confidence: {(item.confidence * 100).toFixed(0)}%
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      ),
    },
    {
      key: 'conversations',
      label: `Conversations (${conversations?.length ?? 0})`,
      children: (
        <List
          loading={conversationsLoading}
          dataSource={conversations ?? []}
          locale={{ emptyText: <Empty description="No conversations yet" /> }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={`${item.channel} - ${item.status}`}
                description={new Date(item.startedAt).toLocaleString()}
              />
              <Tag color={item.status === 'OPEN' ? 'green' : 'default'}>{item.status}</Tag>
            </List.Item>
          )}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={customer.name || 'Customer Detail'}
        subtitle={customer.email || customer.externalId || customerId}
      />

      <Card>
        <Tabs items={tabItems} />
      </Card>
    </>
  );
}
