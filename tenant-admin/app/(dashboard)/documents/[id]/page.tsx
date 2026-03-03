'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, Form, Input, Select, Button, Tag, Space, Timeline, App, Popconfirm, Typography, Spin } from 'antd';
import PageHeader from '@/components/layout/PageHeader';
import {
  useDocument,
  useUpdateDocument,
  usePublishDocument,
  useUnpublishDocument,
  useDocumentVersions,
  useRollbackDocument,
} from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';

const { TextArea } = Input;
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
            }}
          >
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input size="large" />
            </Form.Item>

            <Form.Item name="excerpt" label="Excerpt">
              <Input />
            </Form.Item>

            <Form.Item name="categoryId" label="Category">
              <Select placeholder="Select category" allowClear>
                {categories?.map((cat) => (
                  <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="tagIds" label="Tags">
              <Select mode="multiple" placeholder="Select tags" allowClear>
                {tags?.map((tag) => (
                  <Select.Option key={tag.id} value={tag.id}>{tag.name}</Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="changeNote" label="Change Note">
              <Input placeholder="What changed in this update?" />
            </Form.Item>

            <Form.Item name="content" label="Content (Markdown)" rules={[{ required: true }]}>
              <TextArea rows={20} />
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
