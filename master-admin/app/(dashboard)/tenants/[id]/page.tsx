"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Button, Space, Spin, Statistic, Row, Col, message, Popconfirm, Form, Input } from "antd";
import { FacebookOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getTenantById, getTenantStats, suspendTenant, activateTenant, deleteTenant, updateTenant } from "@/lib/master-api";

const statusColors: Record<string, string> = { ACTIVE: "green", SUSPENDED: "red", PENDING_SETUP: "orange", DEACTIVATED: "default" };

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [messengerForm] = Form.useForm();
  const [savingMessenger, setSavingMessenger] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, sRes]: any[] = await Promise.all([getTenantById(id), getTenantStats(id)]);
      setTenant(tRes.data);
      setStats(sRes.data?.stats);
      // Load messenger config into form
      const messengerConfig = tRes.data?.settings?.messenger;
      if (messengerConfig) {
        messengerForm.setFieldsValue(messengerConfig);
      }
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSaveMessenger = async (values: any) => {
    setSavingMessenger(true);
    try {
      const currentSettings = tenant.settings || {};
      await updateTenant(id, {
        settings: { ...currentSettings, messenger: values },
      });
      message.success("Đã lưu cấu hình Messenger");
      loadData();
    } catch (err: any) {
      message.error(err.message || "Lưu thất bại");
    } finally {
      setSavingMessenger(false);
    }
  };

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

      <Card
        title={<><FacebookOutlined style={{ color: "#1877F2", marginRight: 8 }} />Cấu hình Facebook Messenger</>}
        style={{ marginTop: 16 }}
        extra={tenant.settings?.messenger?.pageId && (
          <Tag icon={<CheckCircleOutlined />} color="success">Đã kết nối</Tag>
        )}
      >
        <Form
          form={messengerForm}
          layout="vertical"
          onFinish={handleSaveMessenger}
          style={{ maxWidth: 600 }}
        >
          <Form.Item
            label="Page ID"
            name="pageId"
            rules={[{ required: true, message: "Nhập Facebook Page ID" }]}
            tooltip="Lấy từ Facebook Developer Console → Page Settings"
          >
            <Input placeholder="VD: 123456789012345" />
          </Form.Item>

          <Form.Item
            label="Page Access Token"
            name="pageAccessToken"
            rules={[{ required: true, message: "Nhập Page Access Token" }]}
            tooltip="Token dài hạn từ Facebook Developer Console"
          >
            <Input.Password placeholder="EAAxxxxxx..." />
          </Form.Item>

          <Form.Item
            label="App Secret"
            name="appSecret"
            tooltip="Dùng để xác thực webhook signature (X-Hub-Signature-256)"
          >
            <Input.Password placeholder="abc123..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={savingMessenger} icon={<FacebookOutlined />}>
              Lưu cấu hình
            </Button>
          </Form.Item>
        </Form>

        <Card type="inner" title="Hướng dẫn kết nối" size="small" style={{ marginTop: 16 }}>
          <ol style={{ paddingLeft: 20, margin: 0, lineHeight: 2 }}>
            <li>Vào <a href="https://developers.facebook.com" target="_blank" rel="noreferrer">Facebook Developer Console</a> → tạo App</li>
            <li>Thêm sản phẩm <strong>Messenger</strong> → chọn Page → lấy <strong>Page Access Token</strong></li>
            <li>Vào <strong>Settings → Basic</strong> → copy <strong>App Secret</strong></li>
            <li>Lấy <strong>Page ID</strong> từ About page hoặc API</li>
            <li>Điền các thông tin trên → <strong>Lưu cấu hình</strong></li>
            <li>Cấu hình Webhook URL: <code>{typeof window !== "undefined" ? window.location.origin.replace(":3001", ":3000") : ""}/api/v1/webhooks/messenger</code></li>
            <li>Verify Token: <code>tino-wiki-verify-2026</code></li>
            <li>Subscribe events: <strong>messages</strong></li>
          </ol>
        </Card>
      </Card>
    </>
  );
}
