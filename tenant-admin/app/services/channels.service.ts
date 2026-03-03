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
}

export interface ChatWidgetConfig {
  enabled: boolean;
  widgetToken?: string;
  theme: {
    primaryColor: string;
    position: 'bottom-right' | 'bottom-left';
  };
  welcomeMessage: string;
  placeholder: string;
  title: string;
}

export interface ChannelsConfig {
  messenger: MessengerConfig | null;
  telegram: TelegramConfig | null;
  chatwidget: ChatWidgetConfig | null;
}

export const channelsService = {
  async getChannels(): Promise<ChannelsConfig> {
    const res = await apiClient.get<ApiResponse<ChannelsConfig>>('/ai/channels');
    return res.data.data;
  },

  async updateChannels(data: {
    messenger?: MessengerConfig | null;
    telegram?: TelegramConfig | null;
    chatwidget?: ChatWidgetConfig | null;
  }): Promise<ChannelsConfig> {
    const res = await apiClient.patch<ApiResponse<ChannelsConfig>>('/ai/channels', data);
    return res.data.data;
  },

  async generateWidgetToken(): Promise<{ widgetToken: string }> {
    const res = await apiClient.post<ApiResponse<{ widgetToken: string }>>('/ai/channels/chatwidget/generate-token');
    return res.data.data;
  },
};
