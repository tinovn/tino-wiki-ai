'use client';

import { Card, Table, Progress, Tag, Space, Typography } from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useDocuments } from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import type { Category } from '@/types/category';

const { Text } = Typography;

export default function KnowledgeBasePage() {
  const { data: allDocs, isLoading: docsLoading } = useDocuments({ limit: 100 });
  const { data: publishedDocs } = useDocuments({ status: 'PUBLISHED', limit: 1 });
  const { data: draftDocs } = useDocuments({ status: 'DRAFT', limit: 1 });
  const { data: categories, isLoading: catsLoading } = useCategories();

  const loading = docsLoading || catsLoading;
  const totalDocs = allDocs?.meta?.total ?? 0;
  const publishedCount = publishedDocs?.meta?.total ?? 0;
  const draftCount = draftDocs?.meta?.total ?? 0;

  const stats = [
    { title: 'Total Documents', value: totalDocs, icon: <BookOutlined /> },
    { title: 'Published', value: publishedCount, icon: <CheckCircleOutlined /> },
    { title: 'Drafts', value: draftCount, icon: <ClockCircleOutlined /> },
    { title: 'Categories', value: categories?.length ?? 0, icon: <WarningOutlined /> },
  ];

  const indexProgress = totalDocs > 0 ? Math.round((publishedCount / totalDocs) * 100) : 0;

  const categoryColumns: ColumnsType<Category> = [
    { title: 'Category', dataIndex: 'name', key: 'name' },
    {
      title: 'Documents',
      key: 'count',
      render: (_, record) => record._count?.documents ?? 0,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
  ];

  return (
    <>
      <PageHeader title="Knowledge Base" subtitle="Document and content overview" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={loading} />
        ))}
      </section>

      <section className="main-grid">
        <Card title="Indexing Status" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div>
              <Text>Published documents</Text>
              <Progress percent={indexProgress} status="active" />
            </div>
            <div>
              <Text>Draft documents</Text>
              <Progress
                percent={totalDocs > 0 ? Math.round((draftCount / totalDocs) * 100) : 0}
                status="normal"
                strokeColor="#faad14"
              />
            </div>
          </Space>
        </Card>

        <Card title="Categories" size="small">
          <Table
            columns={categoryColumns}
            dataSource={categories ?? []}
            rowKey="id"
            loading={catsLoading}
            pagination={false}
            size="small"
          />
        </Card>
      </section>
    </>
  );
}
