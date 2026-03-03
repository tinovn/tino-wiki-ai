'use client';

import { Card, Skeleton, Typography, Tooltip } from 'antd';
import type { DailyQueryStats } from '@/types/analytics';

const { Text } = Typography;

interface QueryTrendCardProps {
  data?: DailyQueryStats[];
  loading?: boolean;
}

export default function QueryTrendCard({ data, loading }: QueryTrendCardProps) {
  if (loading || !data) {
    return (
      <Card title="Xu hướng truy vấn" size="small">
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <Card title="Xu hướng truy vấn" size="small" extra={<Text type="secondary">7 ngày</Text>}>
      <div className="trend-chart">
        {data.map((day) => {
          const successPct = maxTotal > 0 ? (day.successful / maxTotal) * 100 : 0;
          const failPct = maxTotal > 0 ? (day.failed / maxTotal) * 100 : 0;
          const label = day.date.slice(5); // MM-DD

          return (
            <Tooltip key={day.date} title={`${day.date}: ${day.total} queries (${day.successful} ok, ${day.failed} fail)`}>
              <div className="trend-col">
                <div className="trend-bar-container">
                  <div className="trend-bar-fill trend-fail" style={{ height: `${failPct}%` }} />
                  <div className="trend-bar-fill trend-success" style={{ height: `${successPct}%` }} />
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>{label}</Text>
                <Text style={{ fontSize: 11, fontWeight: 500 }}>{day.total}</Text>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
}
