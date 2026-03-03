"use client";

import { useEffect, useState } from "react";
import { Card, Form, Input, Select, Button, Space, message } from "antd";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createMasterDocument, getMasterCategories, getMasterTags } from "@/lib/master-api";

const { TextArea } = Input;

export default function CreateDocPage() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    getMasterCategories().then((r: any) => setCategories(r.data || [])).catch(() => {});
    getMasterTags().then((r: any) => setTags(r.data || [])).catch(() => {});
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try { await createMasterDocument(values); message.success("Đã tạo tài liệu"); router.push("/wiki"); }
    catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Tạo tài liệu mới" subtitle="Thêm tài liệu vào wiki chuyên ngành" />
      <Card style={{ maxWidth: 800 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input placeholder="Tiêu đề tài liệu" /></Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}><TextArea rows={12} placeholder="Nội dung (Markdown)" /></Form.Item>
          <Form.Item name="excerpt" label="Tóm tắt"><TextArea rows={3} /></Form.Item>
          <Form.Item name="categoryId" label="Danh mục"><Select allowClear placeholder="Chọn danh mục" options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
          <Form.Item name="tagIds" label="Tags"><Select mode="multiple" allowClear placeholder="Chọn tags" options={tags.map((t) => ({ value: t.id, label: t.name }))} /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit" loading={loading}>Tạo tài liệu</Button><Button onClick={() => router.back()}>Hủy</Button></Space></Form.Item>
        </Form>
      </Card>
    </>
  );
}
