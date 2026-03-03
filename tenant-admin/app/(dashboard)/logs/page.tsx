'use client';

import { useState } from 'react';
import { Table, Tag, Typography, Space, Select, Card } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useQueryLogs } from '@/hooks/useAnalytics';
import type { QueryLog } from '@/types/analytics';

const { Text } = Typography;

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useQueryLogs({ page, limit: 20, wasSuccessful: filter });

  const logs = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const successCount = logs.filter((l) => l.wasSuccessful).length;
  const failCount = logs.filter((l) => !l.wasSuccessful).length;

  const stats = [
    { title: 'Total Logs', value: total, icon: <FileTextOutlined /> },
    { title: 'Successful', value: successCount, icon: <CheckCircleOutlined /> },
    { title: 'Failed', value: failCount, icon: <WarningOutlined /> },
    { title: 'Page', value: `${page} / ${Math.ceil(total / 20) || 1}`, icon: <ClockCircleOutlined /> },
  ];

  const columns: ColumnsType<QueryLog> = [
    {
      title: 'Question',
      dataIndex: 'question',
      key: 'question',
      ellipsis: true,
      width: '40%',
    },
    {
      title: 'Status',
      dataIndex: 'wasSuccessful',
      key: 'status',
      render: (ok: boolean) => (
        <Tag color={ok ? 'green' : 'red'}>{ok ? 'Success' : 'Failed'}</Tag>
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (v?: number) => (v != null ? `${(v * 100).toFixed(0)}%` : '-'),
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (v?: number) => (v != null ? `${v}ms` : '-'),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <>
      <PageHeader
        title="Logs"
        subtitle="Query logs and system events"
        filters={
          <Select
            placeholder="Filter status"
            allowClear
            style={{ width: 150 }}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
          >
            <Select.Option value={true}>Successful</Select.Option>
            <Select.Option value={false}>Failed</Select.Option>
          </Select>
        }
      />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={isLoading} />
        ))}
      </section>

      <section>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </section>
    </>
  );
}
