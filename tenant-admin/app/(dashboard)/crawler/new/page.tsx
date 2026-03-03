'use client';

import { Form, Input, Select, Button, Card, Space, App } from 'antd';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { useCreateCrawlSource } from '@/hooks/useCrawler';
import { useCategories } from '@/hooks/useCategories';
import type { CreateCrawlSourceRequest, CrawlSourceType } from '@/types/crawler';

const SCHEDULE_PRESETS = [
  { label: 'Manual only', value: '' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily (midnight)', value: '0 0 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
];

export default function NewCrawlSourcePage() {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message } = App.useApp();
  const createSource = useCreateCrawlSource();
  const { data: categories = [] } = useCategories();

  const selectedType = Form.useWatch('type', form) as CrawlSourceType | undefined;

  const onFinish = async (values: any) => {
    const data: CreateCrawlSourceRequest = {
      name: values.name,
      type: values.type,
      url: values.url,
      categoryId: values.categoryId || undefined,
      schedule: values.schedule || undefined,
      config: {},
    };

    // Build config based on type
    if (values.contentSelector) data.config!.contentSelector = values.contentSelector;
    if (values.titleSelector) data.config!.titleSelector = values.titleSelector;
    if (values.maxPages) data.config!.maxPages = parseInt(values.maxPages);
    if (values.delayMs) data.config!.delayMs = parseInt(values.delayMs);

    // API mapping
    if (values.type === 'API') {
      data.config!.apiMapping = {};
      if (values.apiTitleField) data.config!.apiMapping.titleField = values.apiTitleField;
      if (values.apiContentField) data.config!.apiMapping.contentField = values.apiContentField;
      if (values.apiExcerptField) data.config!.apiMapping.excerptField = values.apiExcerptField;
      if (values.apiLinkField) data.config!.apiMapping.linkField = values.apiLinkField;
      if (values.apiItemsPath) data.config!.apiMapping.itemsPath = values.apiItemsPath;
    }

    try {
      await createSource.mutateAsync(data);
      message.success('Crawl source created');
      router.push('/crawler');
    } catch {
      message.error('Failed to create source');
    }
  };

  return (
    <>
      <PageHeader title="New Crawl Source" subtitle="Add a new external data source to crawl" />

      <Card style={{ maxWidth: 700 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="e.g., TechBlog Articles" />
          </Form.Item>

          <Form.Item name="type" label="Source Type" rules={[{ required: true, message: 'Please select a type' }]}>
            <Select placeholder="Select type">
              <Select.Option value="URL">URL - Single page</Select.Option>
              <Select.Option value="SITEMAP">Sitemap - Crawl from sitemap.xml</Select.Option>
              <Select.Option value="RSS">RSS - Parse RSS/Atom feed</Select.Option>
              <Select.Option value="API">API - Fetch from API endpoint</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="url" label="URL" rules={[{ required: true, message: 'Please enter URL' }, { type: 'url', message: 'Please enter a valid URL' }]}>
            <Input placeholder={
              selectedType === 'SITEMAP' ? 'https://example.com/sitemap.xml' :
              selectedType === 'RSS' ? 'https://example.com/feed.xml' :
              'https://example.com/article'
            } />
          </Form.Item>

          <Form.Item name="categoryId" label="Category (optional)">
            <Select placeholder="Assign to category" allowClear>
              {categories.map((cat: any) => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="schedule" label="Schedule">
            <Select placeholder="Select schedule">
              {SCHEDULE_PRESETS.map((preset) => (
                <Select.Option key={preset.value} value={preset.value}>{preset.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Type-specific config */}
          {(selectedType === 'URL' || selectedType === 'SITEMAP') && (
            <>
              <Form.Item name="contentSelector" label="Content CSS Selector (optional)">
                <Input placeholder="e.g., .article-body, #main-content" />
              </Form.Item>
              <Form.Item name="titleSelector" label="Title CSS Selector (optional)">
                <Input placeholder="e.g., h1.title" />
              </Form.Item>
            </>
          )}

          {selectedType === 'API' && (
            <>
              <Form.Item name="apiItemsPath" label="Items Path (optional)" tooltip="JSONPath to array of items, e.g., leave empty for root array">
                <Input placeholder="e.g., data.posts (empty = root array)" />
              </Form.Item>
              <Form.Item name="apiTitleField" label="Title Field" tooltip="JSON field for title, supports dot notation">
                <Input placeholder="title.rendered (WordPress default)" />
              </Form.Item>
              <Form.Item name="apiContentField" label="Content Field" tooltip="JSON field for content">
                <Input placeholder="content.rendered (WordPress default)" />
              </Form.Item>
              <Form.Item name="apiExcerptField" label="Excerpt Field (optional)">
                <Input placeholder="excerpt.rendered" />
              </Form.Item>
              <Form.Item name="apiLinkField" label="Link Field (optional)">
                <Input placeholder="link" />
              </Form.Item>
            </>
          )}

          {selectedType === 'SITEMAP' && (
            <Form.Item name="maxPages" label="Max Pages (optional)">
              <Input type="number" placeholder="e.g., 100" />
            </Form.Item>
          )}

          <Form.Item name="delayMs" label="Delay between requests (ms)">
            <Input type="number" placeholder="1000 (default)" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={createSource.isPending}>
                Create Source
              </Button>
              <Button onClick={() => router.push('/crawler')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
