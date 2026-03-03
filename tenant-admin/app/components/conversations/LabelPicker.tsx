'use client';

import { useState, useRef, useEffect } from 'react';
import { Input, Popover, Button } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { getLabelColor, AVAILABLE_LABELS } from '@/utils/label-utils';

interface Props {
  currentLabels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
}

export default function LabelPicker({ currentLabels, onAdd, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge AVAILABLE_LABELS with any custom labels the conversation already has
  const allKnownLabels = Array.from(new Set([...AVAILABLE_LABELS, ...currentLabels]));

  const filtered = allKnownLabels.filter((l) =>
    l.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const exactMatch = allKnownLabels.some(
    (l) => l.toLowerCase() === search.toLowerCase().trim(),
  );

  const handleToggle = (label: string) => {
    if (currentLabels.includes(label)) {
      onRemove(label);
    } else {
      onAdd(label);
    }
  };

  const handleCreateNew = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setSearch('');
  };

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const content = (
    <div style={{ width: 220 }}>
      <Input
        ref={inputRef as React.Ref<any>}
        placeholder="Tìm kiếm"
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && search.trim() && !exactMatch) {
            handleCreateNew();
          }
        }}
        size="small"
        allowClear
        style={{ marginBottom: 8 }}
      />
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((label) => {
          const isActive = currentLabels.includes(label);
          return (
            <div
              key={label}
              onClick={() => handleToggle(label)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 4,
                cursor: 'pointer',
                background: isActive ? '#f0f5ff' : 'transparent',
                fontSize: 13,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: getLabelColor(label),
                  flexShrink: 0,
                  border: isActive ? '2px solid #1677ff' : '2px solid transparent',
                }}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
          );
        })}
        {search.trim() && !exactMatch && (
          <div
            onClick={handleCreateNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px',
              borderTop: '1px solid #f0f0f0',
              marginTop: 4,
              cursor: 'pointer',
              fontSize: 13,
              color: '#1677ff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <PlusOutlined /> Tạo nhãn &ldquo;{search.trim()}&rdquo;
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
    >
      <button type="button" className="chat-label-add">
        <PlusOutlined />
      </button>
    </Popover>
  );
}
