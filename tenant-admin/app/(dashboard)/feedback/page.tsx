'use client';

import { useState } from 'react';
import { Table, Tag, Typography, Space, Select, Card, Statistic, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  LikeOutlined,
  DislikeOutlined,
  QuestionCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useFeedbackList, useFeedbackSummary } from '@/hooks/useFeedback';
import type { Feedback, FeedbackType } from '@/types/feedback';

const { Text } = Typography;

const feedbackColors: Record<FeedbackType, string> = {
  GOOD: 'green',
  BAD: 'red',
  PARTIALLY_CORRECT: 'orange',
  WRONG_SOURCE: 'purple',
  OUTDATED: 'default',
};

export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFeedbackList({ page, limit: 20 });
  const { data: summary, isLoading: summaryLoading } = useFeedbackSummary();

  const feedbacks = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const stats = [
    { title: 'Total Feedback', value: summary?.total ?? 0, icon: <StarOutlined /> },
    { title: 'Good', value: summary?.byType?.GOOD ?? 0, icon: <LikeOutlined /> },
    { title: 'Bad', value: summary?.byType?.BAD ?? 0, icon: <DislikeOutlined /> },
    { title: 'Avg Score', value: summary?.averageScore?.toFixed(1) ?? '0', icon: <QuestionCircleOutlined /> },
  ];

  const columns: ColumnsType<Feedback> = [
    {
      title: 'Query',
      key: 'query',
      ellipsis: true,
      render: (_, record) => record.queryLog?.question ?? '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: FeedbackType) => (
        <Tag color={feedbackColors[type]}>{type.replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (comment?: string) => comment || '-',
    },
    {
      title: 'Document',
      key: 'document',
      render: (_, record) => record.document?.title ?? '-',
    },
    {
      title: 'User',
      key: 'user',
      render: (_, record) => record.user?.displayName ?? '-',
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <>
      <PageHeader title="Feedback" subtitle="AI response quality feedback" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={summaryLoading} />
        ))}
      </section>

      <section>
        <Table
          columns={columns}
          dataSource={feedbacks}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        />
      </section>
    </>
  );
}
