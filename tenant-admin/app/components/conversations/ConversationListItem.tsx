'use client';

import type { InboxConversation } from '@/types/conversation';
import dayjs from 'dayjs';

const CHANNEL_COLORS: Record<string, string> = {
  messenger: '#1877F2',
  telegram: '#0088cc',
  chatwidget: '#1677ff',
};

function formatConvTime(date: string): string {
  const d = dayjs(date);
  const now = dayjs();
  if (d.isSame(now, 'day')) return d.format('HH:mm');
  if (d.isSame(now.subtract(1, 'day'), 'day')) return 'Hôm qua';
  if (d.isSame(now, 'year')) return d.format('DD/MM');
  return d.format('DD/MM/YY');
}

interface Props {
  conversation: InboxConversation;
  selected: boolean;
  onClick: () => void;
}

export default function ConversationListItem({ conversation, selected, onClick }: Props) {
  const { customer, channel, lastMessage, lastMessageAt, unreadCount, isHandoff } = conversation;
  const name = customer.name || customer.email || customer.externalId || 'Khách';
  const avatarColor = CHANNEL_COLORS[channel] || '#999';
  const hasUnread = unreadCount > 0;

  return (
    <div className={`conv-item ${selected ? 'conv-item-active' : ''}`} onClick={onClick}>
      <div className="conv-avatar" style={{ background: avatarColor }}>
        {name[0]?.toUpperCase()}
      </div>
      <div className="conv-body">
        <div className="conv-top-row">
          <span className={`conv-name ${hasUnread ? 'conv-name-unread' : ''}`}>{name}</span>
          <span className={`conv-time ${hasUnread ? 'conv-time-unread' : ''}`}>
            {lastMessageAt ? formatConvTime(lastMessageAt) : ''}
          </span>
        </div>
        <div className="conv-bottom-row">
          <span className="conv-preview">
            {isHandoff && '⚠ '}
            {lastMessage?.content || 'Chưa có tin nhắn'}
          </span>
          {hasUnread && <span className="conv-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
