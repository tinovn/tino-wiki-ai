"use client";

import { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message } from "antd";
import { CloudServerOutlined, CheckCircleOutlined, PauseCircleOutlined, ClockCircleOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import { getTenants, suspendTenant, activateTenant } from "@/lib/master-api";

const statusColors: Record<string, string> = { ACTIVE: "green", SUSPENDED: "red", PENDING_SETUP: "orange", DEACTIVATED: "default" };
const statusLabels: Record<string, string> = { ACTIVE: "Hoạt động", SUSPENDED: "Tạm ngưng", PENDING_SETUP: "Chờ cài đặt", DEACTIVATED: "Vô hiệu" };

export default function TenantListPage() {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadData = async (p = 1) => {
    setLoading(true);
    try {
      const res: any = await getTenants(p, 20);
      setTenants(res.data || []);
      setTotal(res.meta?.total || 0);
      setPage(p);
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSuspend = async (id: string) => {
    try { await suspendTenant(id); message.success("Đã tạm ngưng"); loadData(page); } catch (err: any) { message.error(err.message); }
  };
  const handleActivate = async (id: string) => {
    try { await activateTenant(id); message.success("Đã kích hoạt"); loadData(page); } catch (err: any) { message.error(err.message); }
  };

  const kpis = [
    { title: "Tổng Tenant", value: total, icon: <CloudServerOutlined /> },
    { title: "Hoạt động", value: tenants.filter((t) => t.status === "ACTIVE").length, icon: <CheckCircleOutlined /> },
    { title: "Tạm ngưng", value: tenants.filter((t) => t.status === "SUSPENDED").length, icon: <PauseCircleOutlined /> },
    { title: "Chờ cài đặt", value: tenants.filter((t) => t.status === "PENDING_SETUP").length, icon: <ClockCircleOutlined /> },
  ];

  const columns = [
    { title: "Tên", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    { title: "Gói", dataIndex: "plan", key: "plan", render: (v: string) => <Tag>{v}</Tag> },
    { title: "Trạng thái", dataIndex: "status", key: "status", render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v] || v}</Tag> },
    { title: "Ngày tạo", dataIndex: "createdAt", key: "createdAt", render: (v: string) => new Date(v).toLocaleDateString("vi-VN") },
    {
      title: "Hành động", key: "actions",
      render: (_: unknown, r: any) => (
        <Space>
          <Link href={`/tenants/${r.id}`}><Button size="small">Chi tiết</Button></Link>
          {r.status === "ACTIVE"
            ? <Button size="small" danger onClick={() => handleSuspend(r.id)}>Tạm ngưng</Button>
            : <Button size="small" type="primary" onClick={() => handleActivate(r.id)}>Kích hoạt</Button>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Quản lý Tenant" subtitle="Danh sách tenant trong hệ thống" />
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Link href="/tenants/create"><Button type="primary" icon={<PlusOutlined />}>Tạo Tenant</Button></Link>
      </div>
      <section className="kpi-grid">{kpis.map((k) => <KpiCard key={k.title} {...k} />)}</section>
      <Table columns={columns} dataSource={tenants} rowKey="id" loading={loading} style={{ marginTop: 16 }}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => loadData(p) }} />
    </>
  );
}
