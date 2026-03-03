'use client';

import { Card, Progress, List, Tag, Typography, Space, Empty } from 'antd';
import { StarOutlined, CheckCircleOutlined, WarningOutlined, BulbOutlined } from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useFeedbackSummary } from '@/hooks/useFeedback';
import { useContentGaps } from '@/hooks/useAnalytics';

const { Text } = Typography;

export default function ScoringPage() {
  const { data: summary, isLoading: summaryLoading } = useFeedbackSummary();
  const { data: gapsData, isLoading: gapsLoading } = useContentGaps({ limit: 10 });

  const loading = summaryLoading;
  const gaps = gapsData?.data ?? [];

  const totalFeedback = summary?.total ?? 0;
  const goodPct = totalFeedback > 0 ? Math.round(((summary?.byType?.GOOD ?? 0) / totalFeedback) * 100) : 0;
  const badPct = totalFeedback > 0 ? Math.round(((summary?.byType?.BAD ?? 0) / totalFeedback) * 100) : 0;

  const stats = [
    { title: 'Avg Score', value: summary?.averageScore?.toFixed(1) ?? '0', icon: <StarOutlined /> },
    { title: 'Total Reviews', value: totalFeedback, icon: <CheckCircleOutlined /> },
    { title: 'Positive Rate', value: `${goodPct}%`, icon: <BulbOutlined /> },
    { title: 'Content Gaps', value: gapsData?.meta?.total ?? 0, icon: <WarningOutlined /> },
  ];

  return (
    <>
      <PageHeader title="Scoring" subtitle="Response quality and content gap analysis" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="main-grid">
        <Card title="Quality Metrics" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text>Good Responses</Text>
              <Progress percent={goodPct} strokeColor="#52c41a" />
            </div>
            <div>
              <Text>Bad Responses</Text>
              <Progress percent={badPct} strokeColor="#ff4d4f" />
            </div>
            <div>
              <Text>Partially Correct</Text>
              <Progress
                percent={
                  totalFeedback > 0
                    ? Math.round(((summary?.byType?.PARTIALLY_CORRECT ?? 0) / totalFeedback) * 100)
                    : 0
                }
                strokeColor="#faad14"
              />
            </div>
          </Space>
        </Card>

        <Card title="Content Gaps" size="small">
          {gaps.length === 0 ? (
            <Empty description="No content gaps detected" />
          ) : (
            <List
              loading={gapsLoading}
              dataSource={gaps}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.question}
                    description={
                      <Space>
                        <Tag color="orange">Frequency: {item.frequency}</Tag>
                        <Tag>{item.status}</Tag>
                      </Space>
                    }
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
