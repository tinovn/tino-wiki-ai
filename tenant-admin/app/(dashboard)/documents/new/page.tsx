'use client';

import { Card, Form, Input, InputNumber, Select, Button, Space, App } from 'antd';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import MarkdownEditor from '@/components/common/MarkdownEditor';
import { useCreateDocument } from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import { useTags, useCreateTag } from '@/hooks/useTags';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_AUDIENCE_LABELS } from '@/types/document';
import type { DocumentType, DocumentAudience } from '@/types/document';

export default function NewDocumentPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = App.useApp();

  const createDoc = useCreateDocument();
  const createTag = useCreateTag();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await createTag.mutateAsync({ name });
      const current = form.getFieldValue('tagIds') || [];
      form.setFieldsValue({ tagIds: [...current, newTag.id] });
    } catch {
      message.error('Failed to create tag');
    }
  };

  const onFinish = async (values: any) => {
    try {
      const doc = await createDoc.mutateAsync(values);
      message.success('Document created');
      router.push(`/documents/${doc.id}`);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to create document');
    }
  };

  return (
    <>
      <PageHeader title="New Document" subtitle="Create a new wiki document" />

      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 800 }}>
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="Document title" size="large" />
          </Form.Item>

          <Form.Item name="excerpt" label="Excerpt">
            <Input placeholder="Brief description of the document" />
          </Form.Item>

          <Form.Item name="categoryId" label="Category">
            <Select placeholder="Select category" allowClear showSearch optionFilterProp="children">
              {categories?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
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
                <Select.Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Space size="middle" style={{ width: '100%' }} align="start">
            <Form.Item name="type" label="Loại tài liệu" initialValue="REFERENCE" style={{ minWidth: 180 }}>
              <Select>
                {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label]) => (
                  <Select.Option key={value} value={value}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="audience" label="Đối tượng" initialValue="PUBLIC" style={{ minWidth: 160 }}>
              <Select>
                {(Object.entries(DOCUMENT_AUDIENCE_LABELS) as [DocumentAudience, string][]).map(([value, label]) => (
                  <Select.Option key={value} value={value}>{label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Độ ưu tiên (1-10)" initialValue={5}>
              <InputNumber min={1} max={10} />
            </Form.Item>
          </Space>

          <Form.Item
            name="content"
            label="Content"
            rules={[{ required: true, message: 'Please enter content' }]}
          >
            <MarkdownEditor placeholder="Write your document content..." minHeight={500} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createDoc.isPending} size="large">
              Create Document
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={() => router.back()}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
