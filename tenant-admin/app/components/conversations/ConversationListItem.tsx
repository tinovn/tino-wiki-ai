'use client';

import { Avatar, Badge, Tag, Typography } from 'antd';
import {
  UserOutlined,
  FacebookOutlined,
  MessageOutlined,
  SendOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import type { InboxConversation } from '@/types/conversation';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  messenger: <FacebookOutlined style={{ color: '#1877F2' }} />,
  telegram: <SendOutlined style={{ color: '#0088cc' }} />,
  chatwidget: <MessageOutlined style={{ color: '#1677ff' }} />,
};

const CHANNEL_COLORS: Record<string, string> = {
  messenger: '#1877F2',
  telegram: '#0088cc',
  chatwidget: '#1677ff',
};

interface Props {
  conversation: InboxConversation;
  selected: boolean;
  onClick: () => void;
}

export default function ConversationListItem({ conversation, selected, onClick }: Props) {
  const { customer, channel, lastMessage, lastMessageAt, unreadCount, isHandoff, labels } = conversation;
  const customerName = customer.name || customer.email || customer.externalId || 'Khách';

  return (
    <div
      className={`conv-list-item ${selected ? 'conv-list-item-selected' : ''}`}
      onClick={onClick}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Badge count={unreadCount} size="small" offset={[-4, 4]}>
          <Avatar size={40} icon={<UserOutlined />} style={{ flexShrink: 0 }}>
            {customerName[0]?.toUpperCase()}
          </Avatar>
        </Badge>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong ellipsis style={{ maxWidth: 160 }}>
              {customerName}
            </Text>
            <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
              {lastMessageAt ? dayjs(lastMessageAt).fromNow() : ''}
            </Text>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            {CHANNEL_ICONS[channel] || <MessageOutlined />}
            <Text type="secondary" ellipsis style={{ fontSize: 12, flex: 1 }}>
              {lastMessage?.content || 'Chưa có tin nhắn'}
            </Text>
          </div>

          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {isHandoff && (
              <Tag color="warning" icon={<AlertOutlined />} style={{ margin: 0, fontSize: 11 }}>
                Handoff
              </Tag>
            )}
            {labels.slice(0, 2).map((label) => (
              <Tag key={label} style={{ margin: 0, fontSize: 11 }}>{label}</Tag>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
