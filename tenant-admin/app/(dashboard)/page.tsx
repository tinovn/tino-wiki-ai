'use client';

import { useState } from 'react';
import { Card, Typography, Statistic, Row, Col, Result, Button, DatePicker } from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import QualityChart from '@/components/dashboard/QualityChart';
import CostCard from '@/components/dashboard/CostCard';
import ServicesCard from '@/components/dashboard/ServicesCard';
import { useDashboardMetrics } from '@/hooks/useAnalytics';
import { useFeedbackSummary } from '@/hooks/useFeedback';

const { Text } = Typography;

export default function DashboardPage() {
  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics();
  const { data: feedbackSummary, isLoading: feedbackLoading } = useFeedbackSummary();

  const loading = isLoading;

  const stats = [
    {
      title: 'Total Queries',
      value: metrics?.totalQueries ?? 0,
      icon: <SearchOutlined />,
    },
    {
      title: 'Success Rate',
      value: metrics ? `${metrics.successRate.toFixed(1)}%` : '0%',
      icon: <UserOutlined />,
    },
    {
      title: 'Avg Latency',
      value: metrics ? `${metrics.avgLatencyMs}ms` : '0ms',
      icon: <ClockCircleOutlined />,
    },
    {
      title: 'Failed Queries',
      value: metrics?.failedQueries ?? 0,
      icon: <WarningOutlined />,
    },
  ];

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="System overview and analytics" />
        <Result
          status="error"
          title="Failed to load dashboard"
          extra={<Button type="primary" onClick={() => refetch()}>Retry</Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="System overview and analytics" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="main-grid">
        <Card title="Overview" size="small">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="Total Queries"
                value={metrics?.totalQueries ?? 0}
                loading={loading}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Successful"
                value={metrics?.successfulQueries ?? 0}
                loading={loading}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Failed"
                value={metrics?.failedQueries ?? 0}
                loading={loading}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Avg Latency"
                value={metrics?.avgLatencyMs ?? 0}
                suffix="ms"
                loading={loading}
              />
            </Col>
          </Row>
        </Card>

        <div className="stack">
          <QualityChart
            data={
              feedbackSummary
                ? [
                    { label: 'Good', value: (feedbackSummary.byType?.GOOD || 0), color: '#52c41a' },
                    { label: 'Partial', value: (feedbackSummary.byType?.PARTIALLY_CORRECT || 0), color: '#faad14' },
                    { label: 'Bad', value: (feedbackSummary.byType?.BAD || 0), color: '#ff4d4f' },
                    { label: 'Wrong Source', value: (feedbackSummary.byType?.WRONG_SOURCE || 0), color: '#722ed1' },
                    { label: 'Outdated', value: (feedbackSummary.byType?.OUTDATED || 0), color: '#8c8c8c' },
                  ]
                : undefined
            }
            loading={feedbackLoading}
          />
          <CostCard loading={loading} />
          <ServicesCard loading={loading} />
        </div>
      </section>
    </>
  );
}
