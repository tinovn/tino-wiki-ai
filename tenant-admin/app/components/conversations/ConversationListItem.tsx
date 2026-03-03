'use client';

import { FacebookOutlined, SendOutlined, GlobalOutlined } from '@ant-design/icons';
import { getLabelColor } from '@/utils/label-utils';
import type { InboxConversation } from '@/types/conversation';
import dayjs from 'dayjs';

const CHANNEL_COLORS: Record<string, string> = {
  messenger: '#1877F2',
  telegram: '#0088cc',
  chatwidget: '#1677ff',
};

const CHANNEL_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  messenger: { icon: <FacebookOutlined style={{ fontSize: 10 }} />, color: '#1877F2' },
  telegram: { icon: <SendOutlined style={{ fontSize: 10 }} />, color: '#0088cc' },
  chatwidget: { icon: <GlobalOutlined style={{ fontSize: 10 }} />, color: '#1677ff' },
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
  const { customer, channel, lastMessage, lastMessageAt, unreadCount, isHandoff, labels, assignedAgent } = conversation;
  const name = customer.name || customer.email || customer.externalId || 'Khách';
  const avatarColor = CHANNEL_COLORS[channel] || '#999';
  const hasUnread = unreadCount > 0;
  const channelIcon = CHANNEL_ICONS[channel];

  const agentPrefix = assignedAgent?.displayName
    ? `${assignedAgent.displayName.split(' ').pop()}:`
    : '';

  return (
    <div className={`conv-item ${selected ? 'conv-item-active' : ''}`} onClick={onClick}>
      <div className="conv-avatar-wrapper">
        <div className="conv-avatar" style={{ background: avatarColor }}>
          {name[0]?.toUpperCase()}
        </div>
        {channelIcon && (
          <div className="conv-avatar-channel-icon" style={{ background: channelIcon.color }}>
            {channelIcon.icon}
          </div>
        )}
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
            {isHandoff && <span style={{ color: '#fa8c16' }}>⚠ </span>}
            {agentPrefix && <span className="conv-preview-agent">{agentPrefix} </span>}
            {lastMessage?.content || 'Chưa có tin nhắn'}
          </span>
          {hasUnread && <span className="conv-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        </div>
        {labels.length > 0 && (
          <div className="conv-labels-row">
            {labels.slice(0, 3).map((label) => (
              <span key={label} className="conv-label-tag" style={{ background: getLabelColor(label) }}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
