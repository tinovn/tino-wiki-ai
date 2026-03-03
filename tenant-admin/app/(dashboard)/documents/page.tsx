'use client';

import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Select, App, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { useDocuments, usePublishDocument, useUnpublishDocument, useDeleteDocument } from '@/hooks/useDocuments';
import type { Document, DocumentStatus } from '@/types/document';

const statusColors: Record<DocumentStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'green',
  ARCHIVED: 'orange',
};

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | undefined>();
  const { message } = App.useApp();

  const { data, isLoading } = useDocuments({ page, limit: 20, search: search || undefined, status: statusFilter });
  const publishDoc = usePublishDocument();
  const unpublishDoc = useUnpublishDocument();
  const deleteDoc = useDeleteDocument();

  const documents = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const columns: ColumnsType<Document> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record) => (
        <Link href={`/documents/${record.id}/view`}>{title}</Link>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: DocumentStatus) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_, record) => record.category?.name ?? '-',
    },
    {
      title: 'Version',
      dataIndex: 'currentVersion',
      key: 'version',
    },
    {
      title: 'Words',
      dataIndex: 'wordCount',
      key: 'wordCount',
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Link href={`/documents/${record.id}/view`}>
            <Button size="small" icon={<EyeOutlined />}>View</Button>
          </Link>
          <Link href={`/documents/${record.id}`}>
            <Button size="small">Edit</Button>
          </Link>
          {record.status === 'DRAFT' ? (
            <Button
              size="small"
              type="primary"
              loading={publishDoc.isPending}
              onClick={async () => {
                try {
                  await publishDoc.mutateAsync(record.id);
                  message.success('Document published');
                } catch {
                  message.error('Failed to publish');
                }
              }}
            >
              Publish
            </Button>
          ) : record.status === 'PUBLISHED' ? (
            <Button
              size="small"
              loading={unpublishDoc.isPending}
              onClick={async () => {
                try {
                  await unpublishDoc.mutateAsync(record.id);
                  message.success('Document unpublished');
                } catch {
                  message.error('Failed to unpublish');
                }
              }}
            >
              Unpublish
            </Button>
          ) : null}
          <Popconfirm
            title="Delete this document?"
            onConfirm={async () => {
              try {
                await deleteDoc.mutateAsync(record.id);
                message.success('Document deleted');
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
        title="Documents"
        subtitle="Manage wiki documents"
        filters={
          <Space>
            <Input.Search
              placeholder="Search documents..."
              allowClear
              style={{ width: 250 }}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 130 }}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="PUBLISHED">Published</Select.Option>
              <Select.Option value="ARCHIVED">Archived</Select.Option>
            </Select>
          </Space>
        }
      />

      <section>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/documents/new">
            <Button type="primary" icon={<PlusOutlined />}>New Document</Button>
          </Link>
        </div>

        <Table
          columns={columns}
          dataSource={documents}
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
