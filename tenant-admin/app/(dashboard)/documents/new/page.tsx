'use client';

import { useState } from 'react';
import { Card, Form, Input, Select, Button, App } from 'antd';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { useCreateDocument } from '@/hooks/useDocuments';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';

const { TextArea } = Input;

export default function NewDocumentPage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = App.useApp();

  const createDoc = useCreateDocument();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();

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
            <Select placeholder="Select category" allowClear>
              {categories?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tagIds" label="Tags">
            <Select mode="multiple" placeholder="Select tags" allowClear>
              {tags?.map((tag) => (
                <Select.Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="content"
            label="Content (Markdown)"
            rules={[{ required: true, message: 'Please enter content' }]}
          >
            <TextArea rows={20} placeholder="Write your document content in Markdown..." />
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
