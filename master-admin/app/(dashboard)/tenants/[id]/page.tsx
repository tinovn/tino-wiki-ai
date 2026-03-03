"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Button, Space, Spin, Statistic, Row, Col, message, Popconfirm } from "antd";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getTenantById, getTenantStats, suspendTenant, activateTenant, deleteTenant } from "@/lib/master-api";

const statusColors: Record<string, string> = { ACTIVE: "green", SUSPENDED: "red", PENDING_SETUP: "orange", DEACTIVATED: "default" };

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes]: any[] = await Promise.all([getTenantById(id), getTenantStats(id)]);
      setTenant(tRes.data);
      setStats(sRes.data?.stats);
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!tenant) return <div>Không tìm thấy tenant</div>;

  return (
    <>
      <PageHeader title={tenant.name} subtitle={`Tenant: ${tenant.slug}`} />
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => router.back()}>Quay lại</Button>
        {tenant.status === "ACTIVE"
          ? <Button danger onClick={async () => { await suspendTenant(id); message.success("Đã tạm ngưng"); loadData(); }}>Tạm ngưng</Button>
          : <Button type="primary" onClick={async () => { await activateTenant(id); message.success("Đã kích hoạt"); loadData(); }}>Kích hoạt</Button>}
        <Popconfirm
          title="Xóa Tenant"
          description="Bạn có chắc muốn xóa tenant này? Database sẽ bị xóa vĩnh viễn."
          onConfirm={async () => {
            try {
              await deleteTenant(id);
              message.success("Đã xóa tenant");
              router.push("/tenants");
            } catch (err: any) {
              message.error(err.message || "Xóa thất bại");
            }
          }}
          okText="Xóa"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button danger type="primary">Xóa Tenant</Button>
        </Popconfirm>
      </Space>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="Thông tin Tenant">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Tên">{tenant.name}</Descriptions.Item>
              <Descriptions.Item label="Slug">{tenant.slug}</Descriptions.Item>
              <Descriptions.Item label="Domain">{tenant.domain || "—"}</Descriptions.Item>
              <Descriptions.Item label="Gói"><Tag>{tenant.plan}</Tag></Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color={statusColors[tenant.status]}>{tenant.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="LLM Provider">{tenant.llmProvider}</Descriptions.Item>
              <Descriptions.Item label="Max Documents">{tenant.maxDocuments}</Descriptions.Item>
              <Descriptions.Item label="Max Queries/Month">{tenant.maxQueriesMonth}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo" span={2}>{new Date(tenant.createdAt).toLocaleString("vi-VN")}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Thống kê">
            <Statistic title="Số Admin" value={stats?.adminCount ?? 0} />
            <Statistic title="Số API Key" value={stats?.apiKeyCount ?? 0} style={{ marginTop: 16 }} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
