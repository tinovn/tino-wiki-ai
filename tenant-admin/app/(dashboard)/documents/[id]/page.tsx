'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, InputNumber, Select, Button, Tag, Space, Timeline, App, Popconfirm, Typography, Spin } from 'antd';
import PageHeader from '@/components/layout/PageHeader';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import {
  useDocument,
  useUpdateDocument,
  usePublishDocument,
  useUnpublishDocument,
  useDocumentVersions,
  useRollbackDocument,
} from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_AUDIENCE_LABELS } from '@/types/document';
import type { DocumentType, DocumentAudience } from '@/types/document';

const { Text } = Typography;

export default function EditDocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data: doc, isLoading } = useDocument(id);
  const { data: versions } = useDocumentVersions(id);
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const updateDoc = useUpdateDocument();
  const publishDoc = usePublishDocument();
  const unpublishDoc = useUnpublishDocument();
  const rollbackDoc = useRollbackDocument();
  const createTag = useCreateTag();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!doc) {
    return <PageHeader title="Document not found" />;
  }

  const onFinish = async (values: any) => {
    try {
      await updateDoc.mutateAsync({ id, data: values });
      message.success('Document updated');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to update');
    }
  };

  const handlePublish = async () => {
    try {
      await publishDoc.mutateAsync(id);
      message.success('Document published');
    } catch {
      message.error('Failed to publish');
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishDoc.mutateAsync(id);
      message.success('Document unpublished');
    } catch {
      message.error('Failed to unpublish');
    }
  };

  const handleRollback = async (version: number) => {
    try {
      await rollbackDoc.mutateAsync({ id, version });
      message.success(`Rolled back to version ${version}`);
    } catch {
      message.error('Failed to rollback');
    }
  };

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTag.mutateAsync({ name });
      const current = form.getFieldValue('tagIds') || [];
      form.setFieldsValue({ tagIds: [...current, newTag.id] });
    } catch {
      message.error('Failed to create tag');
    }
  };

  const statusColors: Record<string, string> = { DRAFT: 'default', PUBLISHED: 'green', ARCHIVED: 'orange' };

  return (
    <>
      <PageHeader
        title={`Edit: ${doc.title}`}
        subtitle={
          <Space>
            <Tag color={statusColors[doc.status]}>{doc.status}</Tag>
            <Text type="secondary">v{doc.currentVersion}</Text>
            <Text type="secondary">{doc.wordCount} words</Text>
          </Space>
        }
        filters={
          <Space>
            {doc.status === 'DRAFT' ? (
              <Button type="primary" onClick={handlePublish} loading={publishDoc.isPending}>
                Publish
              </Button>
            ) : doc.status === 'PUBLISHED' ? (
              <Button onClick={handleUnpublish} loading={unpublishDoc.isPending}>
                Unpublish
              </Button>
            ) : null}
          </Space>
        }
      />

      <section className="main-grid">
        <Card title="Edit Content">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              title: doc.title,
              excerpt: doc.excerpt,
              categoryId: doc.categoryId,
              tagIds: doc.tags?.map((t) => t.id),
              content: doc.content,
              type: doc.type || 'REFERENCE',
              audience: doc.audience || 'PUBLIC',
              priority: doc.priority ?? 5,
            }}
          >
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>

            <Form.Item name="excerpt" label="Excerpt">
              <Input />
            </Form.Item>

            <Form.Item name="categoryId" label="Category">
              <Select placeholder="Select category" allowClear showSearch optionFilterProp="children">
                {categories?.map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="tagIds" label="Tags">
              <Select
                mode="multiple"
                placeholder="Select or type to create tags"
                allowClear
                showSearch
                optionFilterProp="children"
                onInputKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = (e.target as HTMLInputElement).value?.trim();
                    if (input && tags && !tags.some((t) => t.name.toLowerCase() === input.toLowerCase())) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCreateTag(input);
                    }
                  }
                }}
              >
                {tags?.map((tag) => (
                  <Select.Option key={tag.id} value={tag.id}>{tag.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Space size="middle" style={{ width: '100%' }} align="start">
              <Form.Item name="type" label="Loại tài liệu" style={{ minWidth: 180 }}>
                <Select>
                  {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label]) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="audience" label="Đối tượng" style={{ minWidth: 160 }}>
                <Select>
                  {(Object.entries(DOCUMENT_AUDIENCE_LABELS) as [DocumentAudience, string][]).map(([value, label]) => (
                    <Select.Option key={value} value={value}>{label}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="priority" label="Độ ưu tiên (1-10)">
                <InputNumber min={1} max={10} />
              </Form.Item>
            </Space>

            <Form.Item name="changeNote" label="Change Note">
              <Input placeholder="What changed in this update?" />
            </Form.Item>

            <Form.Item name="content" label="Content" rules={[{ required: true }]}>
              <MarkdownEditor placeholder="Write your document content..." minHeight={500} />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={updateDoc.isPending}>
                  Save Changes
                </Button>
                <Button onClick={() => router.back()}>Cancel</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Version History" size="small">
          {versions && versions.length > 0 ? (
            <Timeline
              items={versions.map((v) => ({
                children: (
                  <div>
                    <Text strong>v{v.version}</Text>
                    <br />
                    <Text type="secondary">{v.changeNote || 'No note'}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(v.createdAt).toLocaleString()}
                    </Text>
                    <br />
                    <Popconfirm
                      title={`Rollback to version ${v.version}?`}
                      onConfirm={() => handleRollback(v.version)}
                    >
                      <Button size="small" type="link">
                        Rollback
                      </Button>
                    </Popconfirm>
                  </div>
                ),
              }))}
            />
          ) : (
            <Text type="secondary">No version history</Text>
          )}
        </Card>
      </section>
    </>
  );
}
