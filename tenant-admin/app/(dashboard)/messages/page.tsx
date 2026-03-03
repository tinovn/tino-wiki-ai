'use client';

import { useState } from 'react';
import { Card, List, Tag, Typography, Badge, Space, Input, Button, Empty } from 'antd';
import { MessageOutlined, ClockCircleOutlined, CheckCircleOutlined, AlertOutlined } from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useCustomers } from '@/hooks/useCustomers';
import { useQueryLogs } from '@/hooks/useAnalytics';

const { Text } = Typography;

export default function MessagesPage() {
  const { data: customersData, isLoading: customersLoading } = useCustomers({ limit: 50 });
  const { data: queryData, isLoading: queriesLoading } = useQueryLogs({ limit: 5 });

  const loading = customersLoading || queriesLoading;
  const customers = customersData?.data ?? [];
  const queries = queryData?.data ?? [];

  const stats = [
    { title: 'Total Customers', value: customersData?.meta?.total ?? 0, icon: <MessageOutlined /> },
    { title: 'Recent Queries', value: queryData?.meta?.total ?? 0, icon: <ClockCircleOutlined /> },
    { title: 'Successful', value: queries.filter((q) => q.wasSuccessful).length, icon: <CheckCircleOutlined /> },
    { title: 'Failed', value: queries.filter((q) => !q.wasSuccessful).length, icon: <AlertOutlined /> },
  ];

  return (
    <>
      <PageHeader title="Messages" subtitle="Customer conversations and queries" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="main-grid">
        <Card title="Recent Queries" size="small">
          {queries.length === 0 && !loading ? (
            <Empty description="No queries yet" />
          ) : (
            <List
              loading={loading}
              dataSource={queries}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.question}
                    description={
                      <Space>
                        <Tag color={item.wasSuccessful ? 'green' : 'red'}>
                          {item.wasSuccessful ? 'Success' : 'Failed'}
                        </Tag>
                        {item.latencyMs && <Text type="secondary">{item.latencyMs}ms</Text>}
                        {item.confidence && (
                          <Text type="secondary">
                            Confidence: {(item.confidence * 100).toFixed(0)}%
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card title="Customers" size="small">
          {customers.length === 0 && !loading ? (
            <Empty description="No customers yet" />
          ) : (
            <List
              loading={loading}
              dataSource={customers.slice(0, 10)}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name || item.email || 'Unnamed Customer'}
                    description={item.email}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </section>
    </>
  );
}
