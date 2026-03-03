"use client";

import { useEffect, useState } from "react";
import { Card, Table, Button, Modal, Form, Input, Space, message, Popconfirm } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import PageHeader from "@/components/PageHeader";
import { getMasterCategories, createMasterCategory, updateMasterCategory, deleteMasterCategory } from "@/lib/master-api";

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try { const res: any = await getMasterCategories(); setCategories(res.data || []); }
    catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) { await updateMasterCategory(editing.id, values); message.success("Đã cập nhật"); }
      else { await createMasterCategory(values); message.success("Đã tạo"); }
      setModalOpen(false); loadData();
    } catch (err: any) { message.error(err.message); }
  };

  const columns = [
    { title: "Tên", dataIndex: "name", key: "name" },
    { title: "Slug", dataIndex: "slug", key: "slug" },
    { title: "Mô tả", dataIndex: "description", key: "desc", render: (v: string) => v || "—" },
    { title: "Số bài", dataIndex: ["_count", "documents"], key: "count", render: (v: number) => v ?? 0 },
    {
      title: "Hành động", key: "actions",
      render: (_: unknown, r: any) => (
        <Space>
          <Button size="small" onClick={() => { setEditing(r); form.setFieldsValue({ name: r.name, description: r.description }); setModalOpen(true); }}>Sửa</Button>
          <Popconfirm title="Xóa?" onConfirm={async () => { await deleteMasterCategory(r.id); message.success("Đã xóa"); loadData(); }}><Button size="small" danger>Xóa</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Danh mục Wiki" subtitle="Quản lý danh mục cho wiki chuyên ngành" />
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }}>Tạo danh mục</Button>
      </div>
      <Card><Table columns={columns} dataSource={categories} rowKey="id" loading={loading} pagination={false} /></Card>
      <Modal title={editing ? "Sửa danh mục" : "Tạo danh mục"} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
