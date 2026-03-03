'use client';

import { Card, List, Skeleton, Tag, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import type { RecentQuery } from '@/types/analytics';

const { Text } = Typography;

interface RecentQueriesCardProps {
  data?: RecentQuery[];
  loading?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export default function RecentQueriesCard({ data, loading }: RecentQueriesCardProps) {
  if (loading || !data) {
    return (
      <Card title="Truy vấn gần đây" size="small">
        <Skeleton active paragraph={{ rows: 5 }} />
      </Card>
    );
  }

  return (
    <Card
      title="Truy vấn gần đây"
      size="small"
      extra={<Link href="/logs"><Text type="secondary" style={{ fontSize: 12 }}>Xem tất cả</Text></Link>}
    >
      <List
        dataSource={data}
        size="small"
        renderItem={(item) => (
          <List.Item style={{ padding: '6px 0' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text ellipsis style={{ display: 'block', fontSize: 13 }}>
                {item.question}
              </Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 2, alignItems: 'center' }}>
                {item.wasSuccessful ? (
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>OK</Tag>
                ) : (
                  <Tag color="error" icon={<CloseCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>Fail</Tag>
                )}
                {item.confidence != null && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {(item.confidence * 100).toFixed(0)}%
                  </Text>
                )}
                {item.latencyMs != null && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {item.latencyMs}ms
                  </Text>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </div>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
}
