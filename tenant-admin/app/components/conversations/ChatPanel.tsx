'use client';

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Typography, Tag, Button, Space, Spin, Empty, Dropdown, message as antMessage } from 'antd';
import type { MenuProps } from 'antd';
import {
  CloseCircleOutlined,
  CheckCircleOutlined,
  FacebookOutlined,
  SendOutlined,
  MessageOutlined,
  LoadingOutlined,
  LogoutOutlined,
  SwapOutlined,
  RobotOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useConversation, useConversationMessages, useCloseConversation, useReopenConversation, useAssignConversation, useUnassignConversation, useResumeAi, INBOX_KEY } from '@/hooks/useConversations';
import { useConversationSocket } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { useUsers } from '@/hooks/useUsers';
import { conversationsService } from '@/services/conversations.service';
import { groupMessages } from '@/utils/message-grouping';
import MessageGroupBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import TypingIndicator from './TypingIndicator';
import MessageComposer from './MessageComposer';

const { Title } = Typography;

const CHANNEL_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  messenger: { label: 'Messenger', icon: <FacebookOutlined />, color: '#1877F2' },
  telegram: { label: 'Telegram', icon: <SendOutlined />, color: '#0088cc' },
  chatwidget: { label: 'Web Chat', icon: <MessageOutlined />, color: '#1677ff' },
};

interface Props {
  conversationId: string | null;
}

export default function ChatPanel({ conversationId }: Props) {
  const queryClient = useQueryClient();
  const messageListRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const { data: conversation } = useConversation(conversationId);
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversationMessages(conversationId);
  const { onTyping } = useConversationSocket(conversationId);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  const closeConv = useCloseConversation();
  const reopenConv = useReopenConversation();
  const assignConv = useAssignConversation();
  const unassignConv = useUnassignConversation();
  const resumeAi = useResumeAi();
  const { user: currentUser } = useAuth();
  const { data: usersData } = useUsers({ limit: 100 });

  // Flatten pages: pages[0] = latest, pages[last] = oldest → reverse for chronological
  const allMessages = useMemo(() => {
    if (!data?.pages) return [];
    return [...data.pages].reverse().flatMap((page) => page.messages);
  }, [data]);

  const chatItems = useMemo(() => groupMessages(allMessages), [allMessages]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = messageListRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    if (isNearBottomRef.current && allMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages.length]);

  // Reset initial scroll on conversation change
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [conversationId]);

  // Initial scroll to bottom
  useEffect(() => {
    if (!isLoading && allMessages.length > 0 && !initialScrollDoneRef.current) {
      bottomRef.current?.scrollIntoView();
      initialScrollDoneRef.current = true;
      isNearBottomRef.current = true;
    }
  }, [isLoading, allMessages.length]);

  // Preserve scroll when prepending older messages
  useEffect(() => {
    if (isFetchingNextPage) {
      const el = messageListRef.current;
      if (el) prevScrollHeightRef.current = el.scrollHeight;
    }
  }, [isFetchingNextPage]);

  useEffect(() => {
    const el = messageListRef.current;
    if (!el || prevScrollHeightRef.current === 0) return;
    const diff = el.scrollHeight - prevScrollHeightRef.current;
    if (diff > 0) el.scrollTop += diff;
    prevScrollHeightRef.current = 0;
  }, [data?.pages?.length]);

  // IntersectionObserver: load more on scroll to top
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = messageListRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          const el = messageListRef.current;
          if (el) prevScrollHeightRef.current = el.scrollHeight;
          fetchNextPage();
        }
      },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Typing indicator with auto-clear
  useEffect(() => {
    return onTyping((d) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (d.isTyping) {
          next.set(d.userId, d.displayName || 'Khách');
          setTimeout(() => {
            setTypingUsers((p) => { const n = new Map(p); n.delete(d.userId); return n; });
          }, 5000);
        } else {
          next.delete(d.userId);
        }
        return next;
      });
    });
  }, [onTyping]);

  // Mark as read + update sidebar unread badge
  useEffect(() => {
    if (conversationId && conversation?.unreadCount) {
      conversationsService.markRead(conversationId).then(() => {
        queryClient.invalidateQueries({ queryKey: [INBOX_KEY] });
      });
    }
  }, [conversationId, conversation?.unreadCount, queryClient]);

  if (!conversationId) {
    return (
      <div className="inbox-chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Chọn một hội thoại để bắt đầu" />
      </div>
    );
  }

  const channelInfo = CHANNEL_LABELS[conversation?.channel || ''] || { label: conversation?.channel, icon: <MessageOutlined />, color: '#999' };
  const customerName = conversation?.customer?.name || conversation?.customer?.email || 'Khách';
  const isAssignedToMe = conversation?.assignedAgentId === currentUser?.sub;
  const agents = (usersData?.data ?? []).filter((u) => u.isActive);

  // Build agent action menu items
  const agentMenuItems: MenuProps['items'] = [
    // Leave — only when assigned to me
    ...(isAssignedToMe ? [{
      key: 'leave',
      icon: <LogoutOutlined />,
      label: 'Rời đi',
      onClick: () => {
        unassignConv.mutate(conversationId!, {
          onSuccess: () => antMessage.success('Đã rời khỏi hội thoại'),
        });
      },
    }] : []),
    // Transfer to another agent
    {
      key: 'transfer',
      icon: <SwapOutlined />,
      label: 'Chuyển nhân viên',
      children: agents
        .filter((a) => a.id !== conversation?.assignedAgentId)
        .map((agent) => ({
          key: `agent-${agent.id}`,
          label: agent.displayName,
          onClick: () => {
            assignConv.mutate(
              { conversationId: conversationId!, agentId: agent.id },
              { onSuccess: () => antMessage.success(`Đã chuyển cho ${agent.displayName}`) },
            );
          },
        })),
    },
    // Resume AI — only when in handoff
    ...(conversation?.isHandoff ? [{
      key: 'resume-ai',
      icon: <RobotOutlined />,
      label: 'Chuyển cho AI',
      onClick: () => {
        resumeAi.mutate(conversationId!, {
          onSuccess: () => antMessage.success('AI đã tiếp quản hội thoại'),
        });
      },
    }] : []),
  ];

  return (
    <div className="inbox-chat">
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>{customerName}</Title>
          <Tag icon={channelInfo.icon} color={channelInfo.color}>{channelInfo.label}</Tag>
          {conversation?.isHandoff && <Tag color="warning">Handoff</Tag>}
          {conversation?.assignedAgent && (
            <Tag color="blue">{conversation.assignedAgent.displayName}</Tag>
          )}
          {conversation?.status === 'CLOSED' && <Tag color="default">Đã đóng</Tag>}
        </div>
        <Space>
          {conversation?.status === 'ACTIVE' && agentMenuItems.length > 0 && (
            <Dropdown menu={{ items: agentMenuItems }} trigger={['click']} placement="bottomRight">
              <Button size="small" icon={<TeamOutlined />}>
                Quản lý
              </Button>
            </Dropdown>
          )}
          {conversation?.status === 'ACTIVE' ? (
            <Button
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => closeConv.mutate(conversationId!)}
              loading={closeConv.isPending}
            >
              Đóng
            </Button>
          ) : (
            <Button
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => reopenConv.mutate(conversationId!)}
              loading={reopenConv.isPending}
            >
              Mở lại
            </Button>
          )}
        </Space>
      </div>

      <div className="message-list" ref={messageListRef} onScroll={handleScroll}>
        <div ref={topSentinelRef} style={{ height: 1 }} />

        {isFetchingNextPage && (
          <div className="load-more-spinner">
            <Spin indicator={<LoadingOutlined />} size="small" />
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : (
          chatItems.map((item) => {
            if (item.type === 'date') {
              return <DateSeparator key={`date-${item.date}`} label={item.label} />;
            }
            return <MessageGroupBubble key={`grp-${item.messages[0].id}`} group={item} />;
          })
        )}

        <TypingIndicator users={typingUsers} />
        <div ref={bottomRef} />
      </div>

      {conversation?.status === 'ACTIVE' && (
        <MessageComposer
          conversationId={conversationId}
          isHandoff={conversation?.isHandoff}
          latestMessage={allMessages[allMessages.length - 1]}
        />
      )}
    </div>
  );
}
