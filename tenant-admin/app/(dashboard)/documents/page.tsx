'use client';

import { useState } from 'react';
import { Table, Button, Tag, Space, Input, Select, App, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, EyeOutlined, DownOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import {
  useDocuments,
  usePublishDocument,
  useUnpublishDocument,
  useDeleteDocument,
  useBulkPublish,
  useBulkUnpublish,
  useBulkDelete,
} from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import type { Document, DocumentStatus, DocumentType, DocumentAudience } from '@/types/document';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_AUDIENCE_LABELS } from '@/types/document';

const statusColors: Record<DocumentStatus, string> = {
  DRAFT: 'default',
  PUBLISHED: 'green',
  ARCHIVED: 'orange',
};

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | undefined>();
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [tagFilter, setTagFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<DocumentType | undefined>();
  const [audienceFilter, setAudienceFilter] = useState<DocumentAudience | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const { message } = App.useApp();

  const { data, isLoading } = useDocuments({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter,
    categoryId: categoryFilter,
    tagId: tagFilter,
  });
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const publishDoc = usePublishDocument();
  const unpublishDoc = useUnpublishDocument();
  const deleteDoc = useDeleteDocument();
  const bulkPublish = useBulkPublish();
  const bulkUnpublish = useBulkUnpublish();
  const bulkDelete = useBulkDelete();

  const documents = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const handleBulkPublish = async () => {
    try {
      const result = await bulkPublish.mutateAsync(selectedRowKeys as string[]);
      message.success(`Published ${result.succeeded}/${result.total} documents`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Bulk publish failed');
    }
  };

  const handleBulkUnpublish = async () => {
    try {
      const result = await bulkUnpublish.mutateAsync(selectedRowKeys as string[]);
      message.success(`Unpublished ${result.succeeded}/${result.total} documents`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Bulk unpublish failed');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await bulkDelete.mutateAsync(selectedRowKeys as string[]);
      message.success(`Deleted ${result.succeeded}/${result.total} documents`);
      setSelectedRowKeys([]);
    } catch {
      message.error('Bulk delete failed');
    }
  };

  const bulkLoading = bulkPublish.isPending || bulkUnpublish.isPending || bulkDelete.isPending;

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
      width: 100,
      render: (status: DocumentStatus) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: DocumentType) => type ? <Tag color="blue">{DOCUMENT_TYPE_LABELS[type] || type}</Tag> : '-',
    },
    {
      title: 'Category',
      key: 'category',
      width: 120,
      render: (_, record) => record.category?.name ? <Tag>{record.category.name}</Tag> : '-',
    },
    {
      title: 'Version',
      dataIndex: 'currentVersion',
      key: 'version',
      width: 80,
    },
    {
      title: 'Words',
      dataIndex: 'wordCount',
      key: 'wordCount',
      width: 80,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 110,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space size={4}>
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
          <Space wrap>
            <Input.Search
              placeholder="Search documents..."
              allowClear
              style={{ width: 220 }}
              onSearch={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 130 }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="PUBLISHED">Published</Select.Option>
              <Select.Option value="ARCHIVED">Archived</Select.Option>
            </Select>
            <Select
              placeholder="Category"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: 160 }}
              value={categoryFilter}
              onChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              {categories?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Tag"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: 160 }}
              value={tagFilter}
              onChange={(value) => {
                setTagFilter(value);
                setPage(1);
              }}
            >
              {tags?.map((tag) => (
                <Select.Option key={tag.id} value={tag.id}>{tag.name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Type"
              allowClear
              style={{ width: 140 }}
              value={typeFilter}
              onChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Audience"
              allowClear
              style={{ width: 140 }}
              value={audienceFilter}
              onChange={(value) => {
                setAudienceFilter(value);
                setPage(1);
              }}
            >
              {(Object.entries(DOCUMENT_AUDIENCE_LABELS) as [DocumentAudience, string][]).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
          </Space>
        }
      />

      <section>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {selectedRowKeys.length > 0 && (
              <Space>
                <span style={{ fontWeight: 500 }}>{selectedRowKeys.length} selected</span>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'publish',
                        icon: <CheckCircleOutlined />,
                        label: 'Publish selected',
                        onClick: handleBulkPublish,
                      },
                      {
                        key: 'unpublish',
                        icon: <StopOutlined />,
                        label: 'Unpublish selected',
                        onClick: handleBulkUnpublish,
                      },
                      { type: 'divider' },
                      {
                        key: 'delete',
                        icon: <DeleteOutlined />,
                        label: 'Delete selected',
                        danger: true,
                        onClick: handleBulkDelete,
                      },
                    ],
                  }}
                >
                  <Button loading={bulkLoading}>
                    Bulk Actions <DownOutlined />
                  </Button>
                </Dropdown>
                <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
                  Clear
                </Button>
              </Space>
            )}
          </div>
          <Link href="/documents/new">
            <Button type="primary" icon={<PlusOutlined />}>New Document</Button>
          </Link>
        </div>

        <Table
          columns={columns}
          dataSource={documents}
          rowKey="id"
          loading={isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
            showTotal: (total) => `${total} documents`,
            showSizeChanger: false,
          }}
          size="middle"
        />
      </section>
    </>
  );
}
