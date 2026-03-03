'use client';

import { useState, useRef, useCallback } from 'react';
import { Input, Button, Segmented, Spin, message as antMessage } from 'antd';
import { SendOutlined, RobotOutlined } from '@ant-design/icons';
import { useSendAgentMessage, useAiSuggestion, useAddNote } from '@/hooks/useConversations';
import { emitTyping } from '@/services/websocket.service';

const { TextArea } = Input;

interface Props {
  conversationId: string;
}

export default function MessageComposer({ conversationId }: Props) {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessage = useSendAgentMessage();
  const addNote = useAddNote();
  const aiSuggestion = useAiSuggestion();

  const handleSend = useCallback(() => {
    if (!content.trim()) return;

    if (mode === 'reply') {
      sendMessage.mutate(
        { conversationId, content: content.trim() },
        { onSuccess: () => setContent('') },
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
      onSuccess: (data) => {
        setContent(data.suggestion);
        antMessage.info(`Gợi ý AI (confidence: ${((data.confidence ?? 0) * 100).toFixed(0)}%)`);
      },
      onError: () => antMessage.error('Không thể lấy gợi ý AI'),
    });
  };

  const isSending = sendMessage.isPending || addNote.isPending;

  return (
    <div className="composer-bar">
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
