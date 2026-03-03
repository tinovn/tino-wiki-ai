'use client';

import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Select, App, Popconfirm } from 'antd';
import { PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { useCrawlSources, useDeleteCrawlSource, useTriggerCrawl, useUpdateCrawlSource } from '@/hooks/useCrawler';
import type { CrawlSource, CrawlSourceType, CrawlSourceStatus } from '@/types/crawler';

const typeColors: Record<CrawlSourceType, string> = {
  URL: 'blue',
  SITEMAP: 'purple',
  RSS: 'orange',
  API: 'cyan',
};

const statusColors: Record<CrawlSourceStatus, string> = {
  ACTIVE: 'green',
  PAUSED: 'default',
  ERROR: 'red',
};

export default function CrawlerPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CrawlSourceType | undefined>();
  const [statusFilter, setStatusFilter] = useState<CrawlSourceStatus | undefined>();
  const { message } = App.useApp();

  const { data, isLoading } = useCrawlSources({
    page,
    limit: 20,
    search: search || undefined,
    type: typeFilter,
    status: statusFilter,
  });
  const triggerCrawl = useTriggerCrawl();
  const deleteSource = useDeleteCrawlSource();
  const updateSource = useUpdateCrawlSource();

  const sources = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const columns: ColumnsType<CrawlSource> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link href={`/crawler/${record.id}`}>{name}</Link>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: CrawlSourceType) => (
        <Tag color={typeColors[type]}>{type}</Tag>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: true,
      width: 300,
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule',
      render: (schedule?: string) => schedule || <span style={{ color: '#999' }}>Manual</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: CrawlSourceStatus) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Last Crawl',
      dataIndex: 'lastCrawlAt',
      key: 'lastCrawlAt',
      render: (date?: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Jobs',
      key: 'jobs',
      render: (_, record) => record._count?.jobs ?? 0,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={triggerCrawl.isPending}
            onClick={async () => {
              try {
                await triggerCrawl.mutateAsync(record.id);
                message.success('Crawl started');
              } catch {
                message.error('Failed to start crawl');
              }
            }}
          >
            Crawl
          </Button>
          <Link href={`/crawler/${record.id}`}>
            <Button size="small">Detail</Button>
          </Link>
          {record.status === 'ACTIVE' ? (
            <Button
              size="small"
              onClick={async () => {
                try {
                  await updateSource.mutateAsync({ id: record.id, data: { status: 'PAUSED' } });
                  message.success('Source paused');
                } catch {
                  message.error('Failed to pause');
                }
              }}
            >
              Pause
            </Button>
          ) : record.status === 'PAUSED' ? (
            <Button
              size="small"
              onClick={async () => {
                try {
                  await updateSource.mutateAsync({ id: record.id, data: { status: 'ACTIVE' } });
                  message.success('Source resumed');
                } catch {
                  message.error('Failed to resume');
                }
              }}
            >
              Resume
            </Button>
          ) : null}
          <Popconfirm
            title="Delete this crawl source?"
            onConfirm={async () => {
              try {
                await deleteSource.mutateAsync(record.id);
                message.success('Source deleted');
              } catch {
                message.error('Failed to delete');
              }
            }}
          >
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Web Crawler"
        subtitle="Crawl external data sources into wiki documents"
        filters={
          <Space>
            <Input.Search
              placeholder="Search sources..."
              allowClear
              style={{ width: 250 }}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="Type"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="URL">URL</Select.Option>
              <Select.Option value="SITEMAP">Sitemap</Select.Option>
              <Select.Option value="RSS">RSS</Select.Option>
              <Select.Option value="API">API</Select.Option>
            </Select>
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 120 }}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="ACTIVE">Active</Select.Option>
              <Select.Option value="PAUSED">Paused</Select.Option>
              <Select.Option value="ERROR">Error</Select.Option>
            </Select>
          </Space>
        }
      />

      <section>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/crawler/new">
            <Button type="primary" icon={<PlusOutlined />}>New Source</Button>
          </Link>
        </div>

        <Table
          columns={columns}
          dataSource={sources}
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
