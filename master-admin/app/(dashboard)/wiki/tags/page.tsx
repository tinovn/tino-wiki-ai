"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Modal, Form, Input, Tag, message, Popconfirm } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import PageHeader from "@/components/PageHeader";
import { getMasterTags, createMasterTag, deleteMasterTag } from "@/lib/master-api";

export default function TagsPage() {
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try { const res: any = await getMasterTags(); setTags(res.data || []); }
    catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    const values = await form.validateFields();
    try { await createMasterTag(values); message.success("Đã tạo tag"); setModalOpen(false); form.resetFields(); loadData(); }
    catch (err: any) { message.error(err.message); }
  };

  const columns = [
    { title: "Tên", dataIndex: "name", key: "name", render: (v: string, r: any) => <Tag color={r.color || "blue"}>{v}</Tag> },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    { title: "Số bài", dataIndex: ["_count", "documents"], key: "count", render: (v: number) => v ?? 0 },
    {
      title: "Hành động", key: "actions",
      render: (_: unknown, r: any) => (
        <Popconfirm title="Xóa tag?" onConfirm={async () => { await deleteMasterTag(r.id); message.success("Đã xóa"); loadData(); }}>
          <Button size="small" danger>Xóa</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Quản lý Tags" subtitle="Tags cho wiki chuyên ngành" />
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Tạo tag</Button>
      </div>
      <Card><Table columns={columns} dataSource={tags} rowKey="id" loading={loading} pagination={false} /></Card>
      <Modal title="Tạo tag" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="color" label="Màu"><Input placeholder="#4f5fe0" /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
