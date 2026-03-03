'use client';

import { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, App, Popconfirm } from 'antd';
import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useCustomers, useCreateCustomer } from '@/hooks/useCustomers';
import type { Customer, CreateCustomerRequest } from '@/types/customer';

export default function CustomersPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data, isLoading } = useCustomers({ page, limit: 20 });
  const createCustomer = useCreateCustomer();

  const customers = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const columns: ColumnsType<Customer> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Link href={`/customers/${record.id}`}>{name || 'Unnamed'}</Link>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'External ID', dataIndex: 'externalId', key: 'externalId' },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Link href={`/customers/${record.id}`}>
          <Button size="small">View</Button>
        </Link>
      ),
    },
  ];

  const handleCreate = async (values: CreateCustomerRequest) => {
    try {
      await createCustomer.mutateAsync(values);
      message.success('Customer created');
      setIsModalOpen(false);
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Failed to create customer');
    }
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="Manage customer profiles and data" />

      <section className="kpi-grid">
        <KpiCard title="Total Customers" value={total} icon={<TeamOutlined />} loading={isLoading} />
      </section>

      <section>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
            Add Customer
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        />
      </section>

      <Modal
        title="Add Customer"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Name">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="externalId" label="External ID">
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createCustomer.isPending} block>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
