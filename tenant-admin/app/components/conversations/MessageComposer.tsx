'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Button, Segmented, Spin, Tag, message as antMessage } from 'antd';
import { SendOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { useSendAgentMessage, useAiSuggestion, useAddNote } from '@/hooks/useConversations';
import { emitTyping } from '@/services/websocket.service';
import type { InboxMessage } from '@/types/conversation';

const { TextArea } = Input;

interface Props {
  conversationId: string;
  isHandoff?: boolean;
  latestMessage?: InboxMessage;
}

export default function MessageComposer({ conversationId, isHandoff, latestMessage }: Props) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [suggestionData, setSuggestionData] = useState<{ suggestion: string; confidence: number } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAutoMsgId = useRef<string | null>(null);

  const sendMessage = useSendAgentMessage();
  const addNote = useAddNote();
  const aiSuggestion = useAiSuggestion();

  // Auto-fetch AI suggestion when new customer message arrives during handoff
  useEffect(() => {
    if (
      isHandoff &&
      latestMessage &&
      latestMessage.role === 'CUSTOMER' &&
      latestMessage.id !== prevAutoMsgId.current
    ) {
      prevAutoMsgId.current = latestMessage.id;
      aiSuggestion.mutate(conversationId, {
        onSuccess: (data) => setSuggestionData(data),
      });
    }
  }, [isHandoff, latestMessage?.id, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset suggestion when conversation changes
  useEffect(() => {
    setSuggestionData(null);
    prevAutoMsgId.current = null;
  }, [conversationId]);

  const handleSend = useCallback(() => {
    if (!content.trim()) return;

    if (mode === 'reply') {
      sendMessage.mutate(
        { conversationId, content: content.trim() },
        {
          onSuccess: () => {
            setContent('');
            setSuggestionData(null);
          },
        },
      );
    } else {
      addNote.mutate(
        { conversationId, content: content.trim() },
        { onSuccess: () => setContent('') },
      );
    }
  }, [content, mode, conversationId, sendMessage, addNote]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Emit typing event (debounced)
    if (mode === 'reply') {
      emitTyping(conversationId, true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => emitTyping(conversationId, false), 2000);
    }
  };

  const handleAiSuggest = () => {
    aiSuggestion.mutate(conversationId, {
      onSuccess: (data) => setSuggestionData(data),
      onError: () => antMessage.error('Không thể lấy gợi ý AI'),
    });
  };

  const handleUseSuggestion = () => {
    if (suggestionData) {
      setContent(suggestionData.suggestion);
      setSuggestionData(null);
    }
  };

  const handleDismissSuggestion = () => {
    setSuggestionData(null);
  };

  const isSending = sendMessage.isPending || addNote.isPending;

  const confidenceColor = suggestionData
    ? suggestionData.confidence >= 0.7 ? 'green' : suggestionData.confidence >= 0.4 ? 'orange' : 'red'
    : 'default';

  return (
    <div className="composer-bar">
      {suggestionData && (
        <div className="ai-suggestion-card">
          <div className="ai-suggestion-header">
            <span><RobotOutlined /> Gợi ý AI</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Tag color={confidenceColor} style={{ margin: 0 }}>
                {(suggestionData.confidence * 100).toFixed(0)}%
              </Tag>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleDismissSuggestion}
                style={{ padding: '0 4px', height: 20, width: 20, minWidth: 20 }}
              />
            </div>
          </div>
          <div className="ai-suggestion-body">{suggestionData.suggestion}</div>
          <div className="ai-suggestion-actions">
            <Button size="small" type="primary" onClick={handleUseSuggestion}>
              Sử dụng
            </Button>
            <Button size="small" onClick={handleDismissSuggestion}>
              Bỏ qua
            </Button>
          </div>
        </div>
      )}
      <Segmented
        size="small"
        value={mode}
        onChange={(val) => setMode(val as 'reply' | 'note')}
        options={[
          { label: 'Trả lời', value: 'reply' },
          { label: 'Ghi chú', value: 'note' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <TextArea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'reply' ? 'Nhập tin nhắn... (Enter để gửi)' : 'Ghi chú nội bộ...'}
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{
            flex: 1,
            background: mode === 'note' ? '#fffbe6' : undefined,
            borderColor: mode === 'note' ? '#ffe58f' : undefined,
          }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {mode === 'reply' && (
            <Button
              icon={aiSuggestion.isPending ? <Spin size="small" /> : <RobotOutlined />}
              onClick={handleAiSuggest}
              disabled={aiSuggestion.isPending}
              title="AI Gợi ý"
            />
          )}
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={isSending}
            disabled={!content.trim()}
          />
        </div>
      </div>
    </div>
  );
}
