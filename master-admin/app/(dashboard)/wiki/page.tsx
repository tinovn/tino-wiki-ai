"use client";

import { useEffect, useState } from "react";
import { Table, Tag, Button, Space, message, Popconfirm } from "antd";
import { BookOutlined, CheckCircleOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import KpiCard from "@/components/KpiCard";
import { getMasterDocuments, publishMasterDocument, unpublishMasterDocument, deleteMasterDocument } from "@/lib/master-api";

const statusColors: Record<string, string> = { PUBLISHED: "green", DRAFT: "orange", ARCHIVED: "default" };
const statusLabels: Record<string, string> = { PUBLISHED: "Xuất bản", DRAFT: "Nháp", ARCHIVED: "Lưu trữ" };

export default function WikiListPage() {
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const loadData = async (p = 1) => {
    setLoading(true);
    try {
      const res: any = await getMasterDocuments({ page: p, limit: 20 });
      setDocs(res.data || []);
      setTotal(res.meta?.total || 0);
      setPage(p);
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const columns = [
    { title: "Tiêu đề", dataIndex: "title", key: "title", render: (v: string, r: any) => <Link href={`/wiki/${r.id}`}>{v}</Link> },
    { title: "Danh mục", dataIndex: ["category", "name"], key: "category", render: (v: string) => v || "—" },
    { title: "Trạng thái", dataIndex: "status", key: "status", render: (v: string) => <Tag color={statusColors[v]}>{statusLabels[v]}</Tag> },
    { title: "Phiên bản", dataIndex: "currentVersion", key: "version", render: (v: number) => `v${v}` },
    { title: "Cập nhật", dataIndex: "updatedAt", key: "updatedAt", render: (v: string) => new Date(v).toLocaleDateString("vi-VN") },
    {
      title: "Hành động", key: "actions",
      render: (_: unknown, r: any) => (
        <Space>
          {r.status === "DRAFT" && <Button size="small" type="primary" onClick={async () => { await publishMasterDocument(r.id); message.success("Đã xuất bản"); loadData(page); }}>Xuất bản</Button>}
          {r.status === "PUBLISHED" && <Button size="small" onClick={async () => { await unpublishMasterDocument(r.id); message.success("Đã gỡ"); loadData(page); }}>Gỡ xuất bản</Button>}
          <Popconfirm title="Xóa tài liệu?" onConfirm={async () => { await deleteMasterDocument(r.id); message.success("Đã xóa"); loadData(page); }}><Button size="small" danger>Xóa</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  const kpis = [
    { title: "Tổng tài liệu", value: total, icon: <BookOutlined /> },
    { title: "Đã xuất bản", value: docs.filter((d) => d.status === "PUBLISHED").length, icon: <CheckCircleOutlined /> },
    { title: "Bản nháp", value: docs.filter((d) => d.status === "DRAFT").length, icon: <EditOutlined /> },
    { title: "Lưu trữ", value: docs.filter((d) => d.status === "ARCHIVED").length, icon: <DeleteOutlined /> },
  ];

  return (
    <>
      <PageHeader title="Wiki chuyên ngành" subtitle="Quản lý kiến thức dùng chung cho tất cả tenant" />
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Link href="/wiki/create"><Button type="primary" icon={<PlusOutlined />}>Tạo tài liệu</Button></Link>
      </div>
      <section className="kpi-grid">{kpis.map((k) => <KpiCard key={k.title} {...k} />)}</section>
      <Table columns={columns} dataSource={docs} rowKey="id" loading={loading} style={{ marginTop: 16 }}
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => loadData(p) }} />
    </>
  );
}
