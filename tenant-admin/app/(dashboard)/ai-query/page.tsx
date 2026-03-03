'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag, Divider, App, Empty, Checkbox, Tooltip, Select, Collapse } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, FilterOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import PageHeader from '@/components/layout/PageHeader';
import { useAiQuery, useAiStream } from '@/hooks/useAiQuery';
import { useCategories } from '@/hooks/useCategories';
import type { AiQueryResponse } from '@/types/ai';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_AUDIENCE_LABELS } from '@/types/document';
import type { DocumentType, DocumentAudience } from '@/types/document';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: AiQueryResponse['sources'];
  confidence?: number;
  latencyMs?: number;
}

export default function AiQueryPage() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [useStreaming, setUseStreaming] = useState(true);
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>();
  const [filterDocType, setFilterDocType] = useState<string | undefined>();
  const [filterAudience, setFilterAudience] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { message: appMessage } = App.useApp();

  const aiQuery = useAiQuery();
  const { chunks, isStreaming, stream, reset } = useAiStream();
  const { data: categories } = useCategories();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chunks]);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    const q = question;
    setQuestion('');

    const queryParams = {
      question: q,
      allowGeneralKnowledge,
      categoryId: filterCategoryId,
      documentType: filterDocType,
      audience: filterAudience,
    };

    if (useStreaming) {
      try {
        reset();
        const fullText = await stream(queryParams);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fullText || 'No response' },
        ]);
      } catch {
        appMessage.error('AI query failed');
      }
    } else {
      try {
        const result = await aiQuery.mutateAsync(queryParams);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.answer,
            sources: result.sources,
            confidence: result.confidence,
            latencyMs: result.latencyMs,
          },
        ]);
      } catch {
        appMessage.error('AI query failed');
      }
    }
  };

  return (
    <>
      <PageHeader
        title="AI Query"
        subtitle="Test the AI knowledge engine"
        filters={
          <Space wrap>
            <Tooltip title="Khi bật, AI sẽ trả lời từ kiến thức chung nếu không tìm thấy trong tài liệu">
              <Checkbox
                checked={allowGeneralKnowledge}
                onChange={(e) => setAllowGeneralKnowledge(e.target.checked)}
              >
                Kiến thức chung
              </Checkbox>
            </Tooltip>
            <Select
              placeholder="Category"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: 150 }}
              value={filterCategoryId}
              onChange={setFilterCategoryId}
            >
              {categories?.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Type"
              allowClear
              style={{ width: 130 }}
              value={filterDocType}
              onChange={setFilterDocType}
            >
              {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Select
              placeholder="Audience"
              allowClear
              style={{ width: 130 }}
              value={filterAudience}
              onChange={setFilterAudience}
            >
              {(Object.entries(DOCUMENT_AUDIENCE_LABELS) as [DocumentAudience, string][]).map(([value, label]) => (
                <Select.Option key={value} value={value}>{label}</Select.Option>
              ))}
            </Select>
            <Button
              size="small"
              type={useStreaming ? 'primary' : 'default'}
              onClick={() => setUseStreaming(!useStreaming)}
            >
              {useStreaming ? 'Streaming ON' : 'Streaming OFF'}
            </Button>
          </Space>
        }
      />

      <Card
        style={{ height: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1, overflow: 'auto', paddingBottom: 16 }}>
          {messages.length === 0 && !isStreaming && (
            <Empty description="Ask a question to get started" style={{ marginTop: 80 }} />
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                  color: msg.role === 'user' ? 'white' : 'inherit',
                }}
              >
                <Space size={4}>
                  {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  <Text strong style={{ color: msg.role === 'user' ? 'white' : undefined }}>
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </Text>
                </Space>
                <div style={{ margin: '8px 0 0', color: msg.role === 'user' ? 'white' : undefined }}>
                  {msg.role === 'assistant' ? (
                    <div className="markdown-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : (
                    <Paragraph style={{ margin: 0, color: 'white' }}>{msg.content}</Paragraph>
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Space wrap>
                      {msg.sources.map((s, i) => (
                        <Tag key={i} color="blue">
                          {s.layer}: {s.heading || s.documentId.slice(0, 8)}
                          ({(s.score * 100).toFixed(0)}%)
                        </Tag>
                      ))}
                    </Space>
                  </>
                )}
                {msg.confidence != null && (
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Confidence: {(msg.confidence * 100).toFixed(0)}% | {msg.latencyMs}ms
                    </Text>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isStreaming && chunks && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#f5f5f5',
                }}
              >
                <Space size={4}>
                  <RobotOutlined />
                  <Text strong>AI</Text>
                </Space>
                <div className="markdown-body" style={{ margin: '8px 0 0' }}>
                  <ReactMarkdown>{chunks}</ReactMarkdown>
                  <span className="typing-cursor">|</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
          <TextArea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={aiQuery.isPending || isStreaming}
            style={{ alignSelf: 'flex-end' }}
          >
            Send
          </Button>
        </div>
      </Card>
    </>
  );
}
