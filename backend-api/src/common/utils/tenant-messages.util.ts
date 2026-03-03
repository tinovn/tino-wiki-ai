export type TenantMessageKey =
  | 'welcomeMessage'
  | 'welcomeBackMessage'
  | 'reopenMessage'
  | 'closedMessage'
  | 'handoffMessage'
  | 'aiUnavailableMessage'
  | 'outsideHoursMessage'
  | 'resumeAiMessage';

export const DEFAULT_MESSAGES: Record<TenantMessageKey, string> = {
  welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
  welcomeBackMessage: 'Chào mừng bạn quay lại! Tôi có thể giúp gì cho bạn?',
  reopenMessage: 'Hội thoại đã được mở lại.',
  closedMessage: 'Hội thoại đã được đóng. Cảm ơn bạn đã liên hệ!',
  handoffMessage: 'Đang chuyển tiếp đến nhân viên hỗ trợ. Vui lòng chờ trong giây lát.',
  aiUnavailableMessage: 'Hệ thống AI đang bận. Đang chuyển tiếp đến nhân viên hỗ trợ.',
  outsideHoursMessage: 'Hiện đang ngoài giờ làm việc. Vui lòng để lại tin nhắn, chúng tôi sẽ phản hồi sớm nhất.',
  resumeAiMessage: 'Cuộc hội thoại đã được chuyển lại cho AI hỗ trợ.',
};

/**
 * Resolve a tenant message with priority: channel override > global > default.
 */
export function resolveTenantMessage(
  settings: Record<string, any> | null | undefined,
  key: TenantMessageKey,
  channel?: string,
): string {
  if (!settings) return DEFAULT_MESSAGES[key];

  // 1. Channel-specific override
  if (channel) {
    const channelMsg = settings[channel]?.messages?.[key];
    if (channelMsg && typeof channelMsg === 'string') return channelMsg;
  }

  // 2. Global tenant-level
  const globalMsg = settings.messages?.[key];
  if (globalMsg && typeof globalMsg === 'string') return globalMsg;

  // 3. Hardcoded default
  return DEFAULT_MESSAGES[key];
}
