'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, Tag, Space, Button, Typography, Spin, Divider } from 'antd';
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { useDocument } from '@/hooks/useDocuments';

const { Text } = Typography;

const statusColors: Record<string, string> = { DRAFT: 'default', PUBLISHED: 'green', ARCHIVED: 'orange' };

export default function ViewDocumentPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const { data: doc, isLoading } = useDocument(id);

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

  return (
    <>
      <PageHeader
        title={doc.title}
        subtitle={
          <Space>
            <Tag color={statusColors[doc.status]}>{doc.status}</Tag>
            <Text type="secondary">v{doc.currentVersion}</Text>
            <Text type="secondary">{doc.wordCount} words</Text>
            {doc.category && <Tag>{doc.category.name}</Tag>}
          </Space>
        }
        filters={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              Back
            </Button>
            <Link href={`/documents/${id}`}>
              <Button type="primary" icon={<EditOutlined />}>Edit</Button>
            </Link>
          </Space>
        }
      />

      <Card>
        {doc.excerpt && (
          <>
            <Text type="secondary" italic>{doc.excerpt}</Text>
            <Divider />
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {doc.author && (
            <Text type="secondary">By {doc.author.displayName}</Text>
          )}
          {doc.publishedAt && (
            <Text type="secondary">
              &middot; Published {new Date(doc.publishedAt).toLocaleDateString()}
            </Text>
          )}
          <Text type="secondary">
            &middot; Updated {new Date(doc.updatedAt).toLocaleDateString()}
          </Text>
        </div>

        {doc.tags && doc.tags.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {doc.tags.map((tag) => (
              <Tag key={tag.id} color={tag.color || 'blue'}>{tag.name}</Tag>
            ))}
          </div>
        )}

        <Divider />

        <article className="markdown-body">
          <ReactMarkdown>{doc.content}</ReactMarkdown>
        </article>
      </Card>

      <style jsx global>{`
        .markdown-body {
          font-size: 15px;
          line-height: 1.8;
          color: #333;
        }
        .markdown-body h1 { font-size: 2em; margin: 1em 0 0.5em; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        .markdown-body h2 { font-size: 1.5em; margin: 1em 0 0.5em; font-weight: 600; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
        .markdown-body h3 { font-size: 1.25em; margin: 1em 0 0.5em; font-weight: 600; }
        .markdown-body h4 { font-size: 1em; margin: 1em 0 0.5em; font-weight: 600; }
        .markdown-body p { margin: 0 0 1em; }
        .markdown-body ul, .markdown-body ol { margin: 0 0 1em; padding-left: 2em; }
        .markdown-body li { margin-bottom: 0.25em; }
        .markdown-body blockquote { border-left: 4px solid #dfe2e5; padding: 0 1em; color: #6a737d; margin: 0 0 1em; }
        .markdown-body code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
        .markdown-body pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 0 0 1em; }
        .markdown-body pre code { background: none; padding: 0; }
        .markdown-body a { color: #0366d6; text-decoration: none; }
        .markdown-body a:hover { text-decoration: underline; }
        .markdown-body table { border-collapse: collapse; margin: 0 0 1em; width: 100%; }
        .markdown-body th, .markdown-body td { border: 1px solid #dfe2e5; padding: 6px 13px; }
        .markdown-body th { background: #f6f8fa; font-weight: 600; }
        .markdown-body hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
        .markdown-body strong { font-weight: 600; }
      `}</style>
    </>
  );
}
