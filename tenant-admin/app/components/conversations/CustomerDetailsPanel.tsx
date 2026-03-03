'use client';

import { Typography, Descriptions, Tag, Card, Empty, Select, Collapse } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  IdcardOutlined,
  BulbOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useConversation, useConversationNotes, useRelatedConversations, useUpdateConversation } from '@/hooks/useConversations';
import type { ConversationPriority } from '@/types/conversation';
import type { InboxConversation } from '@/types/conversation';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Khẩn cấp', color: 'red' },
  { value: 'HIGH', label: 'Cao', color: 'orange' },
  { value: 'MEDIUM', label: 'Trung bình', color: 'blue' },
  { value: 'LOW', label: 'Thấp', color: 'green' },
  { value: 'NONE', label: 'Không', color: 'default' },
];

const MEMORY_TYPE_COLORS: Record<string, string> = {
  PREFERENCE: 'blue',
  PRODUCT_INTEREST: 'green',
  ISSUE_HISTORY: 'red',
  NOTE: 'gold',
  CONTEXT: 'purple',
};

interface Props {
  conversationId: string | null;
}

export default function CustomerDetailsPanel({ conversationId }: Props) {
  const { data: conversation } = useConversation(conversationId);
  const { data: notes } = useConversationNotes(conversationId);
  const { data: related } = useRelatedConversations(conversationId);
  const updateConv = useUpdateConversation();

  if (!conversationId || !conversation) {
    return <div className="inbox-details" />;
  }

  const { customer, priority, labels, assignedAgent } = conversation;
  const memories = customer?.memories || [];

  const handlePriorityChange = (value: string) => {
    updateConv.mutate({ conversationId: conversationId!, data: { priority: value } });
  };

  return (
    <div className="inbox-details">
      {/* Customer Info */}
      <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ marginTop: 0 }}>
          <UserOutlined /> {customer.name || 'Khách'}
        </Title>
        <Descriptions column={1} size="small">
          {customer.email && (
            <Descriptions.Item label={<MailOutlined />}>{customer.email}</Descriptions.Item>
          )}
          {customer.phone && (
            <Descriptions.Item label={<PhoneOutlined />}>{customer.phone}</Descriptions.Item>
          )}
          {customer.externalId && (
            <Descriptions.Item label={<IdcardOutlined />}>
              <Text copyable style={{ fontSize: 12 }}>{customer.externalId}</Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* Actions */}
      <Collapse
        ghost
        defaultActiveKey={['actions', 'memories']}
        items={[
          {
            key: 'actions',
            label: 'Hành động',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Mức ưu tiên</Text>
                  <Select
                    value={priority}
                    onChange={handlePriorityChange}
                    style={{ width: '100%' }}
                    size="small"
                    options={PRIORITY_OPTIONS.map((p) => ({
                      value: p.value,
                      label: <Tag color={p.color}>{p.label}</Tag>,
                    }))}
                  />
                </div>
                {assignedAgent && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Nhân viên phụ trách</Text>
                    <div>{assignedAgent.displayName}</div>
                  </div>
                )}
                {labels.length > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Nhãn</Text>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {labels.map((l) => <Tag key={l}>{l}</Tag>)}
                    </div>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'memories',
            label: `Ghi nhớ (${memories.length})`,
            children: memories.length === 0 ? (
              <Empty description="Chưa có ghi nhớ" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {memories.map((m) => (
                  <Card key={m.id} size="small" styles={{ body: { padding: '6px 10px' } }}>
                    <Tag color={MEMORY_TYPE_COLORS[m.type] || 'default'} style={{ fontSize: 10 }}>{m.type}</Tag>
                    <Text strong style={{ fontSize: 12 }}>{m.key}</Text>
                    <div style={{ fontSize: 12 }}>{m.value}</div>
                  </Card>
                ))}
              </div>
            ),
          },
          {
            key: 'notes',
            label: `Ghi chú (${notes?.length || 0})`,
            children: !notes || notes.length === 0 ? (
              <Empty description="Chưa có ghi chú" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notes.map((n) => (
                  <Card key={n.id} size="small" style={{ background: '#fffbe6' }} styles={{ body: { padding: '6px 10px' } }}>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      <BulbOutlined /> {n.user.displayName} - {dayjs(n.createdAt).format('DD/MM HH:mm')}
                    </Text>
                    <div style={{ fontSize: 12 }}>{n.content}</div>
                  </Card>
                ))}
              </div>
            ),
          },
          ...((related && related.length > 0) ? [{
            key: 'related',
            label: `Hội thoại liên quan (${related.length})`,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {related.map((r: InboxConversation) => (
                  <Card key={r.id} size="small" styles={{ body: { padding: '6px 10px' } }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageOutlined style={{ fontSize: 12 }} />
                      <Tag style={{ fontSize: 10, margin: 0 }}>{r.channel}</Tag>
                      <Tag color={r.status === 'ACTIVE' ? 'green' : 'default'} style={{ fontSize: 10, margin: 0 }}>
                        {r.status}
                      </Tag>
                    </div>
                    {r.lastMessage && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }} ellipsis>
                        {r.lastMessage.content}
                      </Text>
                    )}
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {r.lastMessageAt ? dayjs(r.lastMessageAt).format('DD/MM HH:mm') : dayjs(r.startedAt).format('DD/MM HH:mm')}
                    </Text>
                  </Card>
                ))}
              </div>
            ),
          }] : []),
        ]}
      />
    </div>
  );
}
