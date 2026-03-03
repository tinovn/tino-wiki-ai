"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu, Button, Avatar, Space, Typography } from "antd";
import {
  DashboardOutlined,
  CloudServerOutlined,
  BookOutlined,
  SettingOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { masterLogout } from "@/lib/auth";

const { Sider } = Layout;
const { Text, Title } = Typography;

const navItems = [
  { key: "overview", href: "/", icon: <DashboardOutlined />, label: "Tổng quan" },
  { key: "tenants", href: "/tenants", icon: <CloudServerOutlined />, label: "Quản lý Tenant" },
  { key: "wiki", href: "/wiki", icon: <BookOutlined />, label: "Wiki chuyên ngành" },
  { key: "settings", href: "/settings", icon: <SettingOutlined />, label: "Cài đặt" },
];

function getSelectedKey(pathname: string) {
  const matched = navItems.find((item) => {
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.href);
  });
  return matched ? [matched.key] : ["overview"];
}

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: <Link href={item.href}>{item.label}</Link>,
  }));

  return (
    <Sider
      width={260}
      theme="light"
      trigger={null}
      style={{ minHeight: "100vh", padding: 16, borderInlineEnd: "1px solid #f0f0f0" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Avatar shape="square" size={40} style={{ backgroundColor: "#4f5fe0" }}>
          MA
        </Avatar>
        <div>
          <Title level={5} style={{ margin: 0 }}>Master Admin</Title>
          <Text type="secondary">Quản trị hệ thống</Text>
        </div>
      </div>

      <Menu
        mode="inline"
        selectedKeys={getSelectedKey(pathname)}
        items={menuItems}
        style={{ borderInlineEnd: 0 }}
      />

      <div style={{ marginTop: "auto", paddingTop: 12 }}>
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 12 }}>
          <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Space>
              <Avatar size={36} style={{ backgroundColor: "#4f5fe0" }}>SA</Avatar>
              <div>
                <Text strong style={{ display: "block" }}>Super Admin</Text>
                <Text type="secondary">SUPER_OWNER</Text>
              </div>
            </Space>
            <Button size="small" icon={<ExportOutlined />} onClick={masterLogout} />
          </Space>
        </div>
      </div>
    </Sider>
  );
}
