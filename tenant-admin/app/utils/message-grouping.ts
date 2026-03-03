import dayjs from 'dayjs';
import type { InboxMessage, MessageRole } from '@/types/conversation';

export interface MessageGroup {
  type: 'messages';
  role: MessageRole;
  messages: InboxMessage[];
  senderId?: string;
}

export interface DateSeparatorItem {
  type: 'date';
  date: string;
  label: string;
}

export type ChatItem = MessageGroup | DateSeparatorItem;

export function formatDateLabel(date: dayjs.Dayjs): string {
  const today = dayjs().startOf('day');
  const target = date.startOf('day');

  if (target.isSame(today)) return 'Hôm nay';
  if (target.isSame(today.subtract(1, 'day'))) return 'Hôm qua';
  return target.format('D [tháng] M, YYYY');
}

export function groupMessages(messages: InboxMessage[]): ChatItem[] {
  if (messages.length === 0) return [];

  const items: ChatItem[] = [];
  let currentDate: string | null = null;
  let currentGroup: MessageGroup | null = null;

  for (const msg of messages) {
    const msgDate = dayjs(msg.createdAt).format('YYYY-MM-DD');

    // Insert date separator if day changed
    if (msgDate !== currentDate) {
      if (currentGroup) {
        items.push(currentGroup);
        currentGroup = null;
      }
      items.push({
        type: 'date',
        date: msgDate,
        label: formatDateLabel(dayjs(msg.createdAt)),
      });
      currentDate = msgDate;
    }

    // System messages are never grouped
    if (msg.role === 'SYSTEM') {
      if (currentGroup) {
        items.push(currentGroup);
        currentGroup = null;
      }
      items.push({ type: 'messages', role: 'SYSTEM', messages: [msg] });
      continue;
    }

    // Group consecutive same-sender messages
    if (currentGroup && currentGroup.role === msg.role && currentGroup.senderId === msg.senderId) {
      currentGroup.messages.push(msg);
    } else {
      if (currentGroup) items.push(currentGroup);
      currentGroup = {
        type: 'messages',
        role: msg.role,
        messages: [msg],
        senderId: msg.senderId,
      };
    }
  }

  if (currentGroup) items.push(currentGroup);
  return items;
}
