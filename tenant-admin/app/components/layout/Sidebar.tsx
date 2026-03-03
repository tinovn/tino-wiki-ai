'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layout, Menu, Input, Button, Avatar, Badge, Space, Typography } from 'antd';
import {
  SettingOutlined,
  SearchOutlined,
  ExportOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { navItems } from '@/navigation';
import { useAuth } from '@/providers/AuthProvider';

const { Sider } = Layout;
const { Text, Title } = Typography;

function getSelectedKey(pathname: string): string[] {
  const matched = navItems.find((item) => {
    if (item.href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(item.href);
  });

  return matched ? [matched.key] : ['home'];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  const menuItems = filteredItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : '??';

  return (
    <Sider
      width={260}
      theme="light"
      trigger={null}
      style={{ minHeight: '100vh', padding: 16, borderInlineEnd: '1px solid #f0f0f0' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar shape="square" size={40}>
          S
        </Avatar>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Wiki AI
          </Title>
          <Text type="secondary">Workspace</Text>
        </div>
      </div>

      <Input
        style={{ marginTop: 16 }}
        placeholder="Search pages..."
        prefix={<SearchOutlined />}
      />

      <Menu
        mode="inline"
        selectedKeys={getSelectedKey(pathname)}
        items={menuItems}
        style={{ marginTop: 12, borderInlineEnd: 0 }}
      />

      <Space style={{ marginTop: 12 }}>
        <Button size="small" icon={<SettingOutlined />} />
      </Space>

      <div style={{ marginTop: 'auto', paddingTop: 12 }}>
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <Badge status="success" />
            <Text type="success">Bot is running</Text>
          </div>

          <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Avatar size={36}>{userInitials}</Avatar>
              <div>
                <Text strong style={{ display: 'block' }}>
                  {user?.email ?? 'Unknown'}
                </Text>
                <Text type="secondary">{user?.role ?? 'N/A'}</Text>
              </div>
            </Space>
            <Button
              size="small"
              icon={<LogoutOutlined />}
              onClick={logout}
              title="Logout"
            />
          </Space>
        </div>
      </div>
    </Sider>
  );
}
