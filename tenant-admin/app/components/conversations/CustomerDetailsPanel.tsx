'use client';

import { useState } from 'react';
import { Typography, Tag, Select, Button, Input, Avatar, Divider } from 'antd';
import {
  MailOutlined,
  PhoneOutlined,
  MessageOutlined,
  BulbOutlined,
  StarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useConversation, useConversationNotes, useRelatedConversations, useUpdateConversation, useAddNote } from '@/hooks/useConversations';
import { getLabelColor } from '@/utils/label-utils';
import LabelPicker from './LabelPicker';
import type { InboxConversation } from '@/types/conversation';
import dayjs from 'dayjs';

const { Text } = Typography;

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

const CHANNEL_LABELS_MAP: Record<string, string> = {
  messenger: 'Messenger',
  telegram: 'Telegram',
  chatwidget: 'Web Chat',
};

interface Props {
  conversationId: string | null;
}

export default function CustomerDetailsPanel({ conversationId }: Props) {
  const { data: conversation } = useConversation(conversationId);
  const { data: notes } = useConversationNotes(conversationId);
  const { data: related } = useRelatedConversations(conversationId);
  const updateConv = useUpdateConversation();
  const addNoteMutation = useAddNote();

  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  if (!conversationId || !conversation) {
    return <div className="inbox-details" />;
  }

  const { customer, priority, labels, assignedAgent } = conversation;
  const memories = customer?.memories || [];
  const customerName = customer.name || customer.email || 'Khách';

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNoteMutation.mutate(
      { conversationId: conversationId!, content: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText('');
          setIsAddingNote(false);
        },
      },
    );
  };

  const handleAddLabel = (label: string) => {
    if (!labels.includes(label)) {
      updateConv.mutate({ conversationId: conversationId!, data: { labels: [...labels, label] } });
    }
  };

  const handleRemoveLabel = (label: string) => {
    updateConv.mutate({ conversationId: conversationId!, data: { labels: labels.filter((l) => l !== label) } });
  };

  return (
    <div className="inbox-details">
      {/* Customer profile header */}
      <div className="detail-profile">
        <div className="detail-avatar" style={{ background: '#1677ff' }}>
          {customerName[0]?.toUpperCase()}
        </div>
        <div className="detail-name">{customerName}</div>
        {customer.externalId && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{customer.externalId}</div>
        )}
        <Tag style={{ margin: '4px 0' }}>
          {CHANNEL_LABELS_MAP[conversation.channel] || conversation.channel}
        </Tag>
        <Button type="primary" size="small" icon={<MessageOutlined />} style={{ marginTop: 8 }}>
          Nhắn tin
        </Button>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Contact fields */}
      <div className="detail-section" style={{ paddingBottom: 4 }}>
        <div className="detail-field">
          <MailOutlined style={{ color: '#999' }} />
          <span>{customer.email || <span className="detail-placeholder">Click để sửa</span>}</span>
        </div>
        <div className="detail-field">
          <PhoneOutlined style={{ color: '#999' }} />
          <span>{customer.phone || <span className="detail-placeholder">Click để sửa</span>}</span>
        </div>
      </div>

      {/* Potential customer button */}
      <div style={{ padding: '4px 16px 12px' }}>
        <Button block style={{ borderColor: '#d9d9d9' }} icon={<StarOutlined />} disabled>
          Đánh dấu khách tiềm năng
        </Button>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Labels */}
      <div className="detail-section">
        <div className="detail-section-header">
          <span>Nhãn</span>
          <LabelPicker
            currentLabels={labels}
            onAdd={handleAddLabel}
            onRemove={handleRemoveLabel}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {labels.length > 0 ? labels.map((l) => (
            <Tag
              key={l}
              closable
              onClose={() => handleRemoveLabel(l)}
              color={getLabelColor(l)}
            >
              {l}
            </Tag>
          )) : (
            <Text type="secondary" style={{ fontSize: 12 }}>Chưa có nhãn</Text>
          )}
        </div>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Assigned agent */}
      <div className="detail-section">
        <div className="detail-section-header">Phụ trách</div>
        {assignedAgent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={24} style={{ background: '#1677ff', fontSize: 12 }}>
              {assignedAgent.displayName[0]}
            </Avatar>
            <span style={{ fontSize: 13 }}>{assignedAgent.displayName}</span>
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Chưa phân công</Text>
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Priority */}
      <div className="detail-section">
        <div className="detail-section-header">Mức ưu tiên</div>
        <Select
          value={priority}
          onChange={(value) => updateConv.mutate({ conversationId: conversationId!, data: { priority: value } })}
          style={{ width: '100%' }}
          size="small"
          options={PRIORITY_OPTIONS.map((p) => ({
            value: p.value,
            label: <Tag color={p.color}>{p.label}</Tag>,
          }))}
        />
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Notes */}
      <div className="detail-section">
        <div className="detail-section-header">
          <span>Ghi chú ({notes?.length || 0})</span>
          {!isAddingNote && (
            <span className="detail-section-link" onClick={() => setIsAddingNote(true)}>
              Thêm ghi chú
            </span>
          )}
        </div>
        {isAddingNote && (
          <div style={{ marginBottom: 8 }}>
            <Input.TextArea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Nhập ghi chú..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ marginBottom: 6 }}
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => { setIsAddingNote(false); setNoteText(''); }}>
                Hủy
              </Button>
              <Button size="small" type="primary" onClick={handleAddNote} loading={addNoteMutation.isPending}>
                Lưu
              </Button>
            </div>
          </div>
        )}
        {notes && notes.length > 0 && notes.map((n) => (
          <div key={n.id} className="detail-note-item">
            <div className="detail-note-meta">
              <BulbOutlined /> {n.user.displayName} · {dayjs(n.createdAt).format('DD/MM HH:mm')}
            </div>
            <div className="detail-note-content">{n.content}</div>
          </div>
        ))}
        {(!notes || notes.length === 0) && !isAddingNote && (
          <Text type="secondary" style={{ fontSize: 12 }}>Chưa có ghi chú</Text>
        )}
      </div>

      <Divider style={{ margin: 0 }} />

      {/* Memories */}
      {memories.length > 0 && (
        <>
          <div className="detail-section">
            <div className="detail-section-header">Ghi nhớ AI ({memories.length})</div>
            {memories.map((m) => (
              <div key={m.id} className="detail-memory-item">
                <Tag color={MEMORY_TYPE_COLORS[m.type] || 'default'} style={{ fontSize: 10 }}>{m.type}</Tag>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{m.key}</span>
                <div style={{ fontSize: 12, color: '#666' }}>{m.value}</div>
              </div>
            ))}
          </div>
          <Divider style={{ margin: 0 }} />
        </>
      )}

      {/* Related conversations */}
      <div className="detail-section">
        <div className="detail-section-header">Lịch sử hội thoại ({related?.length || 0})</div>
        {related && related.length > 0 ? (
          related.map((r: InboxConversation) => (
            <div key={r.id} className="detail-related-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {r.status === 'ACTIVE' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                ) : (
                  <ClockCircleOutlined style={{ color: '#999', fontSize: 12 }} />
                )}
                <Tag style={{ fontSize: 10, margin: 0 }}>{CHANNEL_LABELS_MAP[r.channel] || r.channel}</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {r.lastMessageAt ? dayjs(r.lastMessageAt).format('DD/MM HH:mm') : dayjs(r.startedAt).format('DD/MM HH:mm')}
                </Text>
              </div>
              {r.lastMessage && (
                <Text type="secondary" ellipsis style={{ fontSize: 11, display: 'block', marginTop: 2, paddingLeft: 18 }}>
                  {r.lastMessage.content}
                </Text>
              )}
            </div>
          ))
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Không có</Text>
        )}
      </div>
    </div>
  );
}
