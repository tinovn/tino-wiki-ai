'use client';

import { useEffect, useRef } from 'react';
import { Typography, Tag, Button, Space, Spin, Empty } from 'antd';
import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  UserAddOutlined,
  FacebookOutlined,
  SendOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useConversation, useConversationMessages, useCloseConversation, useReopenConversation } from '@/hooks/useConversations';
import { useConversationSocket } from '@/hooks/useWebSocket';
import { conversationsService } from '@/services/conversations.service';
import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';

const { Text, Title } = Typography;

const CHANNEL_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  messenger: { label: 'Messenger', icon: <FacebookOutlined />, color: '#1877F2' },
  telegram: { label: 'Telegram', icon: <SendOutlined />, color: '#0088cc' },
  chatwidget: { label: 'Web Chat', icon: <MessageOutlined />, color: '#1677ff' },
};

interface Props {
  conversationId: string | null;
}

export default function ChatPanel({ conversationId }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: conversation } = useConversation(conversationId);
  const { data: messages, isLoading } = useConversationMessages(conversationId);
  useConversationSocket(conversationId);

  const closeConv = useCloseConversation();
  const reopenConv = useReopenConversation();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when opening
  useEffect(() => {
    if (conversationId && conversation?.unreadCount) {
      conversationsService.markRead(conversationId);
    }
  }, [conversationId, conversation?.unreadCount]);

  if (!conversationId) {
    return (
      <div className="inbox-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Chọn một hội thoại để bắt đầu" />
      </div>
    );
  }

  const channelInfo = CHANNEL_LABELS[conversation?.channel || ''] || { label: conversation?.channel, icon: <MessageOutlined />, color: '#999' };
  const customerName = conversation?.customer?.name || conversation?.customer?.email || 'Khách';

  return (
    <div className="inbox-chat">
      {/* Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>{customerName}</Title>
          <Tag icon={channelInfo.icon} color={channelInfo.color}>{channelInfo.label}</Tag>
          {conversation?.isHandoff && <Tag color="warning">Handoff</Tag>}
          {conversation?.status === 'CLOSED' && <Tag color="default">Đã đóng</Tag>}
        </div>
        <Space>
          {conversation?.status === 'ACTIVE' ? (
            <Button
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => closeConv.mutate(conversationId!)}
              loading={closeConv.isPending}
            >
              Đóng
            </Button>
          ) : (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => reopenConv.mutate(conversationId!)}
              loading={reopenConv.isPending}
            >
              Mở lại
            </Button>
          )}
        </Space>
      </div>

      {/* Messages */}
      <div className="message-list">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          <>
            {messages?.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Composer */}
      {conversation?.status === 'ACTIVE' && (
        <MessageComposer conversationId={conversationId} />
      )}
    </div>
  );
}
