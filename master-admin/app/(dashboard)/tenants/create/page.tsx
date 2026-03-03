"use client";

import { useState } from "react";
import { Card, Form, Input, Select, Button, Space, message } from "antd";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { createTenant } from "@/lib/master-api";

export default function CreateTenantPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await createTenant(values);
      message.success("Tenant đã được tạo");
      router.push("/tenants");
    } catch (err: any) { message.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Tạo Tenant mới" subtitle="Thêm tenant vào hệ thống" />
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Tên Tenant" rules={[{ required: true, message: "Bắt buộc" }]}><Input placeholder="Tên công ty" /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true, message: "Bắt buộc" }]}><Input placeholder="ten-cong-ty" /></Form.Item>
          <Form.Item name="domain" label="Domain"><Input placeholder="example.com" /></Form.Item>
          <Form.Item name="plan" label="Gói dịch vụ" initialValue="FREE">
            <Select options={[{ value: "FREE", label: "Free" }, { value: "STARTER", label: "Starter" }, { value: "PROFESSIONAL", label: "Professional" }, { value: "ENTERPRISE", label: "Enterprise" }]} />
          </Form.Item>
          <Form.Item name="adminEmail" label="Email Admin" rules={[{ required: true }, { type: "email", message: "Email không hợp lệ" }]}><Input placeholder="admin@example.com" /></Form.Item>
          <Form.Item name="adminPassword" label="Mật khẩu Admin" rules={[{ required: true }, { min: 6, message: "Tối thiểu 6 ký tự" }]}><Input.Password /></Form.Item>
          <Form.Item><Space><Button type="primary" htmlType="submit" loading={loading}>Tạo Tenant</Button><Button onClick={() => router.back()}>Hủy</Button></Space></Form.Item>
        </Form>
      </Card>
    </>
  );
}
