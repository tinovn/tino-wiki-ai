'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input, Button, Spin, Tag, message as antMessage } from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  CloseOutlined,
  SmileOutlined,
  PictureOutlined,
  PaperClipOutlined,
  CodeOutlined,
} from '@ant-design/icons';
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
      {/* AI Suggestion card */}
      {suggestionData && (
        <div className="ai-suggestion-card" style={{ margin: '12px 12px 0' }}>
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

      {/* Mode tabs */}
      <div className="composer-mode-tabs">
        <span
          className={`composer-tab ${mode === 'reply' ? 'composer-tab-active' : ''}`}
          onClick={() => setMode('reply')}
        >
          Trả lời
        </span>
        <span
          className={`composer-tab ${mode === 'note' ? 'composer-tab-active composer-tab-note' : ''}`}
          onClick={() => setMode('note')}
        >
          Ghi chú
        </span>
      </div>

      {/* TextArea */}
      <TextArea
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          mode === 'reply'
            ? "Nhập '/' để chọn tin nhắn mẫu, '@' để sử dụng câu lệnh nhanh"
            : 'Ghi chú nội bộ...'
        }
        autoSize={{ minRows: 2, maxRows: 6 }}
        className={`composer-textarea ${mode === 'note' ? 'composer-textarea-note' : ''}`}
        variant="borderless"
      />

      {/* Bottom toolbar */}
      <div className="composer-toolbar">
        <div className="composer-toolbar-left">
          <Button type="text" size="small" icon={<SmileOutlined />} title="Emoji" disabled />
          <Button type="text" size="small" icon={<PictureOutlined />} title="Hình ảnh" disabled />
          <Button type="text" size="small" icon={<PaperClipOutlined />} title="Tệp đính kèm" disabled />
          <Button type="text" size="small" icon={<CodeOutlined />} title="Đoạn mã" disabled />
          {mode === 'reply' && (
            <Button
              type="text"
              size="small"
              icon={aiSuggestion.isPending ? <Spin size="small" /> : <RobotOutlined />}
              onClick={handleAiSuggest}
              disabled={aiSuggestion.isPending}
              title="AI Gợi ý"
              className="composer-ai-btn"
            />
          )}
        </div>
        <Button
          type="primary"
          size="small"
          icon={<SendOutlined />}
          onClick={handleSend}
          loading={isSending}
          disabled={!content.trim()}
          className="composer-send-btn"
        />
      </div>
    </div>
  );
}
