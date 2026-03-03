'use client';

import { useState } from 'react';
import { Card, Table, Progress, Space, Typography, Button, Modal, Form, Input, InputNumber, Popconfirm, App, Statistic, Row, Col, Popover, Tag } from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  WarningOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useDocuments, useIndexingStats, useBulkReprocess } from '@/hooks/useDocuments';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Category, CreateCategoryRequest } from '@/types/category';

const { Text } = Typography;

export default function KnowledgeBasePage() {
  const { data: allDocs, isLoading: docsLoading } = useDocuments({ limit: 100 });
  const { data: publishedDocs } = useDocuments({ status: 'PUBLISHED', limit: 1 });
  const { data: draftDocs } = useDocuments({ status: 'DRAFT', limit: 1 });
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: indexingStats, isLoading: statsLoading } = useIndexingStats();
  const bulkReprocess = useBulkReprocess();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { message } = App.useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const loading = docsLoading || catsLoading;
  const totalDocs = allDocs?.meta?.total ?? 0;
  const publishedCount = publishedDocs?.meta?.total ?? 0;
  const draftCount = draftDocs?.meta?.total ?? 0;

  const stats = [
    { title: 'Total Documents', value: totalDocs, icon: <BookOutlined /> },
    { title: 'Published', value: publishedCount, icon: <CheckCircleOutlined /> },
    { title: 'Drafts', value: draftCount, icon: <ClockCircleOutlined /> },
    { title: 'Categories', value: categories?.length ?? 0, icon: <FolderOutlined /> },
  ];

  const indexProgress = totalDocs > 0 ? Math.round((publishedCount / totalDocs) * 100) : 0;

  const openCreate = () => {
    setEditingCategory(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    form.setFieldsValue({ name: cat.name, description: cat.description, sortOrder: cat.sortOrder });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data: values });
        message.success('Category updated');
      } else {
        await createCategory.mutateAsync(values as CreateCategoryRequest);
        message.success('Category created');
      }
      setModalOpen(false);
      form.resetFields();
    } catch {
      message.error(editingCategory ? 'Failed to update' : 'Failed to create');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      message.success('Category deleted');
    } catch {
      message.error('Failed to delete category');
    }
  };

  const categoryColumns: ColumnsType<Category> = [
    { title: 'Category', dataIndex: 'name', key: 'name' },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc?: string) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: 'Documents',
      key: 'count',
      width: 100,
      render: (_, record) => record._count?.documents ?? 0,
    },
    {
      title: 'Order',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 70,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="Delete this category?"
            description={record._count?.documents ? `${record._count.documents} documents will be unlinked.` : undefined}
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
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
        <Card
          title="AI Vector Index"
          size="small"
          extra={
            <Popover
              title="Reprocess all published documents?"
              content={
                <Space direction="vertical" size="small">
                  <Text type="secondary">Re-enqueue documents chưa có embedding hoặc đã failed.</Text>
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      loading={bulkReprocess.isPending}
                      onClick={async () => {
                        try {
                          const r = await bulkReprocess.mutateAsync(false);
                          message.success(`Enqueued ${r.enqueued} documents (skipped ${r.skipped})`);
                        } catch { message.error('Reprocess failed'); }
                      }}
                    >
                      Missing only
                    </Button>
                    <Button
                      size="small"
                      danger
                      loading={bulkReprocess.isPending}
                      onClick={async () => {
                        try {
                          const r = await bulkReprocess.mutateAsync(true);
                          message.success(`Force reprocess: enqueued ${r.enqueued}/${r.total}`);
                        } catch { message.error('Reprocess failed'); }
                      }}
                    >
                      Force all
                    </Button>
                  </Space>
                </Space>
              }
              trigger="click"
            >
              <Button size="small" icon={<SyncOutlined />}>Reprocess</Button>
            </Popover>
          }
        >
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Statistic
                title="Indexed"
                value={indexingStats?.indexed ?? 0}
                suffix={<Text type="secondary">/ {indexingStats?.totalPublished ?? 0}</Text>}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
                loading={statsLoading}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Vectors"
                value={indexingStats?.vectorCount ?? 0}
                prefix={<DatabaseOutlined />}
                loading={statsLoading}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Chunks"
                value={indexingStats?.chunks ?? 0}
                prefix={<ThunderboltOutlined />}
                loading={statsLoading}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 16 }}>
            <Text>Indexing progress</Text>
            <Progress
              percent={indexingStats?.totalPublished ? Math.round((indexingStats.indexed / indexingStats.totalPublished) * 100) : 0}
              status={indexingStats?.failed ? 'exception' : 'active'}
            />
          </div>

          {((indexingStats?.failed ?? 0) > 0 || (indexingStats?.notProcessed ?? 0) > 0 || (indexingStats?.pending ?? 0) > 0) && (
            <Space style={{ marginTop: 8 }} wrap>
              {(indexingStats?.pending ?? 0) > 0 && (
                <Tag icon={<SyncOutlined spin />} color="processing">{indexingStats!.pending} processing</Tag>
              )}
              {(indexingStats?.failed ?? 0) > 0 && (
                <Tag icon={<WarningOutlined />} color="error">{indexingStats!.failed} failed</Tag>
              )}
              {(indexingStats?.notProcessed ?? 0) > 0 && (
                <Tag icon={<ClockCircleOutlined />} color="warning">{indexingStats!.notProcessed} not processed</Tag>
              )}
            </Space>
          )}
        </Card>

        <Card
          title="Categories"
          size="small"
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
              New Category
            </Button>
          }
        >
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

      <Modal
        title={editingCategory ? 'Edit Category' : 'New Category'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={createCategory.isPending || updateCategory.isPending}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g., Hosting, Domain, cPanel" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
