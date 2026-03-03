'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Tag, List, Divider, App, Empty } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import PageHeader from '@/components/layout/PageHeader';
import { useAiQuery, useAiStream } from '@/hooks/useAiQuery';
import type { AiQueryResponse } from '@/types/ai';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { message: appMessage } = App.useApp();

  const aiQuery = useAiQuery();
  const { chunks, isStreaming, stream, reset } = useAiStream();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chunks]);

  const handleSend = async () => {
    if (!question.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    const q = question;
    setQuestion('');

    if (useStreaming) {
      try {
        reset();
        const fullText = await stream({ question: q });
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: fullText || 'No response' },
        ]);
      } catch {
        appMessage.error('AI query failed');
      }
    } else {
      try {
        const result = await aiQuery.mutateAsync({ question: q });
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
          <Button
            size="small"
            type={useStreaming ? 'primary' : 'default'}
            onClick={() => setUseStreaming(!useStreaming)}
          >
            {useStreaming ? 'Streaming ON' : 'Streaming OFF'}
          </Button>
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
