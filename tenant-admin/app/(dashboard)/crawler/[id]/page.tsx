'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, Descriptions, Tag, Table, Button, Space, App, Tabs, Spin, Typography } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/layout/PageHeader';
import { useCrawlSource, useCrawlJobs, useTriggerCrawl, useTriggerRecrawl, useCrawlJobResults } from '@/hooks/useCrawler';
import type { CrawlJob, CrawlJobStatus, CrawlResult, CrawlResultStatus } from '@/types/crawler';

const jobStatusColors: Record<CrawlJobStatus, string> = {
  PENDING: 'default',
  RUNNING: 'processing',
  COMPLETED: 'success',
  FAILED: 'error',
};

const resultStatusColors: Record<CrawlResultStatus, string> = {
  SUCCESS: 'green',
  SKIPPED: 'default',
  FAILED: 'red',
};

export default function CrawlSourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { message } = App.useApp();
  const [jobPage, setJobPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [resultPage, setResultPage] = useState(1);

  const { data: source, isLoading: sourceLoading } = useCrawlSource(id);
  const { data: jobsData, isLoading: jobsLoading } = useCrawlJobs(id, jobPage);
  const triggerCrawl = useTriggerCrawl();
  const triggerRecrawl = useTriggerRecrawl();
  const { data: resultsData, isLoading: resultsLoading } = useCrawlJobResults(
    selectedJobId || '',
    resultPage,
  );

  const jobs = jobsData?.data ?? [];
  const jobsTotal = jobsData?.meta?.total ?? 0;
  const results = resultsData?.data ?? [];
  const resultsTotal = resultsData?.meta?.total ?? 0;

  if (sourceLoading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!source) return <Typography.Text>Source not found</Typography.Text>;

  const jobColumns: ColumnsType<CrawlJob> = [
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: CrawlJobStatus) => (
        <Tag color={jobStatusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalUrls',
      key: 'totalUrls',
    },
    {
      title: 'New',
      dataIndex: 'newDocuments',
      key: 'newDocuments',
      render: (n: number) => <span style={{ color: '#52c41a' }}>{n}</span>,
    },
    {
      title: 'Skipped',
      dataIndex: 'skippedUrls',
      key: 'skippedUrls',
    },
    {
      title: 'Failed',
      dataIndex: 'failedUrls',
      key: 'failedUrls',
      render: (n: number) => n > 0 ? <span style={{ color: '#ff4d4f' }}>{n}</span> : 0,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date?: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Completed',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date?: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedJobId(record.id);
            setResultPage(1);
          }}
        >
          View Results
        </Button>
      ),
    },
  ];

  const resultColumns: ColumnsType<CrawlResult> = [
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      width: 400,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: CrawlResultStatus) => (
        <Tag color={resultStatusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Error',
      dataIndex: 'error',
      key: 'error',
      ellipsis: true,
      render: (error?: string) => error ? <Typography.Text type="danger">{error}</Typography.Text> : '-',
    },
    {
      title: 'Crawled',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
    },
  ];

  return (
    <>
      <PageHeader
        title={source.name}
        subtitle={`${source.type} crawler source`}
      />

      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Type">
            <Tag>{source.type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={source.status === 'ACTIVE' ? 'green' : source.status === 'ERROR' ? 'red' : 'default'}>
              {source.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="URL" span={2}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.url}</a>
          </Descriptions.Item>
          <Descriptions.Item label="Schedule">
            {source.schedule || 'Manual only'}
          </Descriptions.Item>
          <Descriptions.Item label="Last Crawl">
            {source.lastCrawlAt ? new Date(source.lastCrawlAt).toLocaleString() : 'Never'}
          </Descriptions.Item>
          <Descriptions.Item label="Category">
            {source.category?.name ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Total Jobs">
            {source._count?.jobs ?? 0}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={triggerCrawl.isPending}
              onClick={async () => {
                try {
                  await triggerCrawl.mutateAsync(source.id);
                  message.success('Crawl started (new URLs only)');
                } catch {
                  message.error('Failed to start crawl');
                }
              }}
            >
              Crawl New URLs
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={triggerRecrawl.isPending}
              onClick={async () => {
                try {
                  await triggerRecrawl.mutateAsync(source.id);
                  message.success('Re-crawl started (stale URLs > 30 days)');
                } catch {
                  message.error('Failed to start re-crawl');
                }
              }}
            >
              Re-crawl Stale
            </Button>
          </Space>
        </div>
      </Card>

      <Tabs
        defaultActiveKey="jobs"
        items={[
          {
            key: 'jobs',
            label: 'Job History',
            children: (
              <Table
                columns={jobColumns}
                dataSource={jobs}
                rowKey="id"
                loading={jobsLoading}
                pagination={{
                  current: jobPage,
                  total: jobsTotal,
                  pageSize: 20,
                  onChange: setJobPage,
                }}
              />
            ),
          },
          {
            key: 'results',
            label: `Results${selectedJobId ? '' : ' (select a job)'}`,
            children: selectedJobId ? (
              <Table
                columns={resultColumns}
                dataSource={results}
                rowKey="id"
                loading={resultsLoading}
                pagination={{
                  current: resultPage,
                  total: resultsTotal,
                  pageSize: 50,
                  onChange: setResultPage,
                }}
              />
            ) : (
              <Typography.Text type="secondary">
                Select a job from the Job History tab to view its results.
              </Typography.Text>
            ),
          },
        ]}
      />
    </>
  );
}
