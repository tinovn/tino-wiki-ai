import React from 'react';
import type { ReactNode } from 'react';
import {
  HomeOutlined,
  UserOutlined,
  MessageOutlined,
  BookOutlined,
  StarOutlined,
  FileTextOutlined,
  CloudOutlined,
  GlobalOutlined,
  SettingOutlined,
  FileSearchOutlined,
  RobotOutlined,
  TeamOutlined,
  LikeOutlined,
  ApiOutlined,
} from '@ant-design/icons';

export interface NavItem {
  key: string;
  href: string;
  icon: ReactNode;
  label: string;
  roles?: string[];
}

export const navItems: NavItem[] = [
  { key: 'home', href: '/', icon: React.createElement(HomeOutlined), label: 'Dashboard' },
  { key: 'users', href: '/users', icon: React.createElement(UserOutlined), label: 'Users', roles: ['ADMIN'] },
  { key: 'conversations', href: '/conversations', icon: React.createElement(MessageOutlined), label: 'Conversations' },
  { key: 'knowledge', href: '/knowledge-base', icon: React.createElement(BookOutlined), label: 'Knowledge Base' },
  { key: 'documents', href: '/documents', icon: React.createElement(FileSearchOutlined), label: 'Documents' },
  { key: 'customers', href: '/customers', icon: React.createElement(TeamOutlined), label: 'Customers' },
  { key: 'ai-query', href: '/ai-query', icon: React.createElement(RobotOutlined), label: 'AI Query' },
  { key: 'scoring', href: '/scoring', icon: React.createElement(StarOutlined), label: 'Scoring' },
  { key: 'feedback', href: '/feedback', icon: React.createElement(LikeOutlined), label: 'Feedback' },
  { key: 'logs', href: '/logs', icon: React.createElement(FileTextOutlined), label: 'Logs' },
  { key: 'crawler', href: '/crawler', icon: React.createElement(GlobalOutlined), label: 'Crawler', roles: ['ADMIN', 'EDITOR'] },
  { key: 'channels', href: '/channels', icon: React.createElement(ApiOutlined), label: 'Channels', roles: ['ADMIN'] },
  { key: 'mcp', href: '/mcp-connections', icon: React.createElement(CloudOutlined), label: 'MCP Connections' },
  { key: 'settings', href: '/settings', icon: React.createElement(SettingOutlined), label: 'Settings' },
];
