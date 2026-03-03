import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types/api';

export interface MessengerConfig {
  pageId: string;
  pageAccessToken: string;
  appSecret: string;
}

export interface TelegramConfig {
  botToken: string;
  botUsername?: string;
  webhookSecret?: string;
}

export interface ChannelsConfig {
  messenger: MessengerConfig | null;
  telegram: TelegramConfig | null;
}

export const channelsService = {
  async getChannels(): Promise<ChannelsConfig> {
    const res = await apiClient.get<ApiResponse<ChannelsConfig>>('/ai/channels');
    return res.data.data;
  },

  async updateChannels(data: { messenger?: MessengerConfig | null; telegram?: TelegramConfig | null }): Promise<ChannelsConfig> {
    const res = await apiClient.patch<ApiResponse<ChannelsConfig>>('/ai/channels', data);
    return res.data.data;
  },

  async setupTelegramWebhook(tenantSlug: string, baseUrl?: string): Promise<{ ok: boolean; description?: string }> {
    const res = await apiClient.post<{ ok: boolean; description?: string }>(`/webhooks/telegram/${tenantSlug}/setup`, { baseUrl });
    return res.data;
  },
};
