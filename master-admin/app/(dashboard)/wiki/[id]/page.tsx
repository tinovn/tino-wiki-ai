"use client";

import { useEffect, useState } from "react";
import { Card, Form, Input, Select, Button, Space, Spin, Tag, List, message } from "antd";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getMasterDocumentById, updateMasterDocument, publishMasterDocument, unpublishMasterDocument, getMasterDocumentVersions, getMasterCategories, getMasterTags } from "@/lib/master-api";

const { TextArea } = Input;
const statusColors: Record<string, string> = { PUBLISHED: "green", DRAFT: "orange", ARCHIVED: "default" };

export default function DocDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dR, vR, cR, tR]: any[] = await Promise.all([getMasterDocumentById(id), getMasterDocumentVersions(id), getMasterCategories(), getMasterTags()]);
      const d = dR.data;
      setDoc(d); setVersions(vR.data || []); setCategories(cR.data || []); setTags(tR.data || []);
      form.setFieldsValue({ title: d.title, content: d.content, excerpt: d.excerpt, categoryId: d.categoryId, tagIds: d.tags?.map((t: any) => t.tag?.id || t.tagId) || [] });
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  const onSave = async (values: any) => {
    setSaving(true);
    try { await updateMasterDocument(id, { ...values, changeNote: values.changeNote || "Cập nhật" }); message.success("Đã lưu"); loadData(); }
    catch (err: any) { message.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;
  if (!doc) return <div>Không tìm thấy tài liệu</div>;

  return (
    <>
      <PageHeader title={doc.title} subtitle={<><Tag color={statusColors[doc.status]}>{doc.status}</Tag> v{doc.currentVersion}</>} />
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => router.back()}>Quay lại</Button>
        {doc.status === "DRAFT" && <Button type="primary" onClick={async () => { await publishMasterDocument(id); message.success("Đã xuất bản"); loadData(); }}>Xuất bản</Button>}
        {doc.status === "PUBLISHED" && <Button onClick={async () => { await unpublishMasterDocument(id); message.success("Đã gỡ"); loadData(); }}>Gỡ xuất bản</Button>}
      </Space>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 }}>
        <Card title="Chỉnh sửa">
          <Form form={form} layout="vertical" onFinish={onSave}>
            <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="content" label="Nội dung" rules={[{ required: true }]}><TextArea rows={16} /></Form.Item>
            <Form.Item name="excerpt" label="Tóm tắt"><TextArea rows={3} /></Form.Item>
            <Form.Item name="categoryId" label="Danh mục"><Select allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Form.Item>
            <Form.Item name="tagIds" label="Tags"><Select mode="multiple" allowClear options={tags.map((t) => ({ value: t.id, label: t.name }))} /></Form.Item>
            <Form.Item name="changeNote" label="Ghi chú"><Input placeholder="Mô tả thay đổi" /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" loading={saving}>Lưu thay đổi</Button></Form.Item>
          </Form>
        </Card>
        <Card title="Lịch sử phiên bản" size="small">
          <List size="small" dataSource={versions} renderItem={(v: any) => (
            <List.Item><div><strong>v{v.version}</strong><br /><small>{new Date(v.createdAt).toLocaleString("vi-VN")}</small>{v.changeNote && <><br /><small>{v.changeNote}</small></>}</div></List.Item>
          )} />
        </Card>
      </div>
    </>
  );
}
