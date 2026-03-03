'use client';

import { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Space, App, Popconfirm } from 'antd';
import { PlusOutlined, UserOutlined, TeamOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '@/components/layout/PageHeader';
import KpiCard from '@/components/dashboard/KpiCard';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers';
import type { User, CreateUserRequest } from '@/types/user';
import type { UserRole } from '@/types/auth';

const roleColors: Record<string, string> = {
  ADMIN: 'red',
  EDITOR: 'blue',
  AGENT: 'green',
  VIEWER: 'default',
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const { data, isLoading } = useUsers({ page, limit: 20 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const stats = [
    { title: 'Total Users', value: total, icon: <TeamOutlined /> },
    { title: 'Active', value: users.filter((u) => u.isActive).length, icon: <CheckCircleOutlined /> },
    { title: 'Admins', value: users.filter((u) => u.role === 'ADMIN').length, icon: <UserOutlined /> },
    { title: 'Inactive', value: users.filter((u) => !u.isActive).length, icon: <StopOutlined /> },
  ];

  const columns: ColumnsType<User> = [
    { title: 'Name', dataIndex: 'displayName', key: 'displayName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color={roleColors[role]}>{role}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue(record);
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Popconfirm title="Delete this user?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: CreateUserRequest) => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, data: values });
        message.success('User updated');
      } else {
        await createUser.mutateAsync(values);
        message.success('User created');
      }
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      message.success('User deleted');
    } catch {
      message.error('Failed to delete user');
    }
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Manage team members and roles" />

      <section className="kpi-grid">
        {stats.map((item) => (
          <KpiCard key={item.title} {...item} loading={isLoading} />
        ))}
      </section>

      <section>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Add User
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: setPage,
          }}
        />
      </section>

      <Modal
        title={editingUser ? 'Edit User' : 'Create User'}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingUser && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {!editingUser && (
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="Role">
            <Select>
              <Select.Option value="ADMIN">Admin</Select.Option>
              <Select.Option value="EDITOR">Editor</Select.Option>
              <Select.Option value="AGENT">Agent</Select.Option>
              <Select.Option value="VIEWER">Viewer</Select.Option>
            </Select>
          </Form.Item>
          {editingUser && (
            <Form.Item name="isActive" label="Active">
              <Select>
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Inactive</Select.Option>
              </Select>
            </Form.Item>
          )}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={createUser.isPending || updateUser.isPending}
              block
            >
              {editingUser ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
