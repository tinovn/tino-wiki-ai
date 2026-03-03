'use client';

import { Typography } from 'antd';
import { RobotOutlined, UserOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import type { InboxMessage } from '@/types/conversation';
import dayjs from 'dayjs';

const { Text } = Typography;

interface Props {
  message: InboxMessage;
}

export default function MessageBubble({ message }: Props) {
  const { role, content, createdAt, metadata } = message;

  if (role === 'SYSTEM') {
    return (
      <div className="message-bubble message-bubble-system">
        <Text type="secondary" style={{ fontSize: 12 }}>{content}</Text>
      </div>
    );
  }

  const isCustomer = role === 'CUSTOMER';
  const isAgent = role === 'AGENT';
  const isAi = role === 'AI_ASSISTANT';
  const isSuggestion = (metadata as any)?.isSuggestion;

  const bubbleClass = isCustomer
    ? 'message-bubble-customer'
    : isAgent
    ? 'message-bubble-agent'
    : 'message-bubble-ai';

  return (
    <div className={`message-row ${isCustomer ? 'message-row-left' : 'message-row-right'}`}>
      <div className={`message-bubble ${bubbleClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          {isCustomer && <UserOutlined style={{ fontSize: 11 }} />}
          {isAgent && <CustomerServiceOutlined style={{ fontSize: 11 }} />}
          {isAi && <RobotOutlined style={{ fontSize: 11 }} />}
          <Text style={{ fontSize: 11, opacity: 0.7 }}>
            {isCustomer ? 'Khách' : isAgent ? 'Nhân viên' : 'AI'}
            {isSuggestion && ' (gợi ý)'}
          </Text>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</div>
        <Text style={{ fontSize: 10, opacity: 0.5, display: 'block', textAlign: 'right', marginTop: 2 }}>
          {dayjs(createdAt).format('HH:mm')}
        </Text>
      </div>
    </div>
  );
}
