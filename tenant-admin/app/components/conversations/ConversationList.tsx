'use client';

import { useState } from 'react';
import { Input, Spin, Empty, Dropdown, Button } from 'antd';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useInboxConversations } from '@/hooks/useConversations';
import ConversationListItem from './ConversationListItem';
import type { ConversationView } from '@/types/conversation';

const VIEW_LABELS: Record<ConversationView, string> = {
  all: 'Tất cả',
  mine: 'Của tôi',
  unassigned: 'Chưa phân',
};

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
      <div className="conv-sidebar-header">
        <span className="conv-sidebar-title">Hội thoại</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Dropdown
            menu={{
              items: [
                { key: 'all', label: 'Tất cả' },
                { key: 'mine', label: 'Của tôi' },
                { key: 'unassigned', label: 'Chưa phân công' },
              ],
              selectedKeys: [view],
              onClick: ({ key }) => setView(key as ConversationView),
            }}
            trigger={['click']}
          >
            <Button size="small" className="conv-filter-pill">
              {VIEW_LABELS[view]}
              {total > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({total})</span>}
            </Button>
          </Dropdown>
          <Dropdown
            menu={{
              items: [
                { key: 'all-ch', label: 'Tất cả kênh' },
                { key: 'chatwidget', label: 'Web Chat' },
                { key: 'messenger', label: 'Messenger' },
                { key: 'telegram', label: 'Telegram' },
              ],
              selectedKeys: [channel || 'all-ch'],
              onClick: ({ key }) => setChannel(key === 'all-ch' ? undefined : key),
            }}
            trigger={['click']}
          >
            <Button
              size="small"
              type="text"
              icon={<FilterOutlined />}
              className={channel ? 'conv-filter-active' : ''}
            />
          </Dropdown>
        </div>
      </div>

      <div style={{ padding: '0 12px 8px' }}>
        <Input
          placeholder="Tìm kiếm hội thoại..."
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          size="small"
          style={{ borderRadius: 6 }}
        />
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
