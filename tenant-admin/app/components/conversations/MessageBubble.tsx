'use client';

import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import type { MessageGroup } from '@/utils/message-grouping';
import dayjs from 'dayjs';

function formatMsgDate(createdAt: string): string {
  const d = dayjs(createdAt);
  const today = dayjs().startOf('day');
  if (d.startOf('day').isSame(today)) return 'Hôm nay';
  if (d.startOf('day').isSame(today.subtract(1, 'day'))) return 'Hôm qua';
  return d.format('DD/MM');
}

interface Props {
  group: MessageGroup;
  customerName?: string;
  agentName?: string;
}

export default function MessageGroupBubble({ group, customerName, agentName }: Props) {
  const { role, messages } = group;

  // System messages
  if (role === 'SYSTEM') {
    return (
      <div className="msg-system">
        <span>{messages[0].content}</span>
      </div>
    );
  }

  const isRight = role === 'AGENT';
  const isCustomer = role === 'CUSTOMER';
  const alignClass = isRight ? 'msg-row-right' : 'msg-row-left';
  const colorClass = isCustomer ? 'bubble-customer' : role === 'AGENT' ? 'bubble-agent' : 'bubble-ai';

  const firstMsg = messages[0];
  const timeLabel = dayjs(firstMsg.createdAt).format('HH:mm');
  const dateLabel = formatMsgDate(firstMsg.createdAt);

  const senderLabel = isCustomer
    ? `${customerName || 'Khách'} · ${timeLabel}, ${dateLabel}`
    : isRight
      ? `${timeLabel}, ${dateLabel} · ${agentName || 'Nhân viên'}`
      : `AI · ${timeLabel}, ${dateLabel}`;

  return (
    <>
      <div className={`msg-sender-label ${isRight ? 'msg-sender-right' : 'msg-sender-left'}`}>
        {senderLabel}
      </div>
      <div className={`msg-group ${alignClass}`}>
        {!isRight && (
          <div className="msg-avatar">
            {isCustomer ? <UserOutlined /> : <RobotOutlined />}
          </div>
        )}
        <div className="msg-bubbles">
          {messages.map((msg, i) => {
            const isFirst = i === 0;
            const isLast = i === messages.length - 1;
            const isOnly = messages.length === 1;
            const shapeClass = isOnly ? 'bubble-only' : isFirst ? 'bubble-first' : isLast ? 'bubble-last' : 'bubble-mid';
            const isOptimistic = (msg.metadata as Record<string, unknown>)?._optimistic;

            return (
              <div
                key={msg.id}
                className={`msg-bubble ${colorClass} ${shapeClass}`}
                style={isOptimistic ? { opacity: 0.7 } : undefined}
              >
                <div className="msg-content">{msg.content}</div>
                {isLast && (
                  <span className="msg-time">{dayjs(msg.createdAt).format('HH:mm')}</span>
                )}
              </div>
            );
          })}
        </div>
        {isRight && (
          <div className="msg-avatar" style={{ background: '#52c41a' }}>
            {(agentName || 'A')[0]}
          </div>
        )}
      </div>
    </>
  );
}
