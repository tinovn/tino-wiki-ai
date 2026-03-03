'use client';

import { useState } from 'react';
import { Card, Table, Progress, Space, Typography, Button, Modal, Form, Input, InputNumber, Popconfirm, App } from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useDocuments } from '@/hooks/useDocuments';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import type { Category, CreateCategoryRequest } from '@/types/category';

const { Text } = Typography;

export default function KnowledgeBasePage() {
  const { data: allDocs, isLoading: docsLoading } = useDocuments({ limit: 100 });
  const { data: publishedDocs } = useDocuments({ status: 'PUBLISHED', limit: 1 });
  const { data: draftDocs } = useDocuments({ status: 'DRAFT', limit: 1 });
  const { data: categories, isLoading: catsLoading } = useCategories();
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
