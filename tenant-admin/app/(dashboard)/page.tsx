'use client';

import { useState } from 'react';
import { Card, Typography, Statistic, Row, Col, Result, Button, DatePicker } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import QualityChart from '@/components/dashboard/QualityChart';
import CostCard from '@/components/dashboard/CostCard';
import QueryTrendCard from '@/components/dashboard/QueryTrendCard';
import ConfidenceCard from '@/components/dashboard/ConfidenceCard';
import RecentQueriesCard from '@/components/dashboard/RecentQueriesCard';
import { useDashboardMetrics } from '@/hooks/useAnalytics';
import { useFeedbackSummary } from '@/hooks/useFeedback';

const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<[string | undefined, string | undefined]>([undefined, undefined]);

  const { data: metrics, isLoading, isError, refetch } = useDashboardMetrics(dateRange[0], dateRange[1]);
  const { data: feedbackSummary, isLoading: feedbackLoading } = useFeedbackSummary();

  const loading = isLoading;

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].toISOString(), dates[1].toISOString()]);
    } else {
      setDateRange([undefined, undefined]);
    }
  };

  const stats = [
    {
      title: 'Tổng truy vấn',
      value: metrics?.totalQueries ?? 0,
      icon: <SearchOutlined />,
    },
    {
      title: 'Tỉ lệ thành công',
      value: metrics ? `${metrics.successRate.toFixed(1)}%` : '0%',
      icon: <CheckCircleOutlined />,
    },
    {
      title: 'Độ trễ TB',
      value: metrics ? `${metrics.avgLatencyMs}ms` : '0ms',
      icon: <ClockCircleOutlined />,
    },
    {
      title: 'Truy vấn lỗi',
      value: metrics?.failedQueries ?? 0,
      icon: <WarningOutlined />,
    },
  ];

  if (isError) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Tổng quan hệ thống" />
        <Result
          status="error"
          title="Không thể tải dashboard"
          extra={<Button type="primary" onClick={() => refetch()}>Thử lại</Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan hệ thống"
        filters={
          <RangePicker
            onChange={handleDateChange}
            placeholder={['Từ ngày', 'Đến ngày']}
            allowClear
          />
        }
      />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="main-grid equal-columns" style={{ marginTop: 16 }}>
        <QueryTrendCard data={metrics?.queriesByDay} loading={loading} />
        <ConfidenceCard data={metrics?.confidenceDistribution} loading={loading} />
      </section>

      <section className="main-grid" style={{ marginTop: 16 }}>
        <RecentQueriesCard data={metrics?.recentQueries} loading={loading} />

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
          <CostCard
            inputTokens={metrics?.tokenUsage?.totalPromptTokens}
            outputTokens={metrics?.tokenUsage?.totalCompletionTokens}
            estimatedCost={metrics?.tokenUsage?.estimatedCost}
            loading={loading}
          />
        </div>
      </section>
    </>
  );
}
