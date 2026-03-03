'use client';

import { useState } from 'react';
import { Input, Spin, Empty, Segmented, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useInboxConversations } from '@/hooks/useConversations';
import ConversationListItem from './ConversationListItem';
import type { ConversationView } from '@/types/conversation';

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({ selectedId, onSelect }: Props) {
  const [view, setView] = useState<ConversationView>('all');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<string | undefined>(undefined);

  const { data, isLoading } = useInboxConversations({
    view,
    search: search || undefined,
    channel,
    limit: 50,
  });

  const conversations = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <div className="inbox-sidebar">
      <div style={{ padding: '12px 12px 0' }}>
        <Segmented
          block
          value={view}
          onChange={(val) => setView(val as ConversationView)}
          options={[
            { label: `Tôi`, value: 'mine' },
            { label: `Chưa phân`, value: 'unassigned' },
            { label: `Tất cả (${total})`, value: 'all' },
          ]}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            size="small"
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Kênh"
            value={channel}
            onChange={(val) => setChannel(val || undefined)}
            allowClear
            size="small"
            style={{ width: 100 }}
            options={[
              { label: 'Widget', value: 'chatwidget' },
              { label: 'Telegram', value: 'telegram' },
              { label: 'Messenger', value: 'messenger' },
            ]}
          />
        </div>
      </div>

      <div className="conv-list-scroll">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : conversations.length === 0 ? (
          <Empty description="Không có hội thoại" style={{ padding: 40 }} />
        ) : (
          conversations.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              selected={conv.id === selectedId}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
