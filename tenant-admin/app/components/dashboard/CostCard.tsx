'use client';

import { Card, Col, Row, Skeleton, Statistic } from 'antd';

interface CostCardProps {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  loading?: boolean;
}

export default function CostCard({ inputTokens, outputTokens, estimatedCost, loading }: CostCardProps) {
  return (
    <Card title="Cost" size="small">
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : (
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Statistic title="Input Tokens" value={inputTokens ?? 0} />
          </Col>
          <Col span={24}>
            <Statistic title="Output Tokens" value={outputTokens ?? 0} />
          </Col>
          <Col span={24}>
            <Statistic title="Estimated Cost" prefix="$" value={estimatedCost ?? 0} precision={2} />
          </Col>
        </Row>
      )}
    </Card>
  );
}
