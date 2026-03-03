'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App, Divider } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { message } = App.useApp();

  const onFinish = async (values: { email: string; password: string; displayName: string }) => {
    setLoading(true);
    try {
      await register(values);
      message.success('Account created successfully');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        width: 420,
        borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={3} style={{ margin: 0, color: '#1a1f36' }}>
          Create Account
        </Title>
        <Text type="secondary">Join Tino Wiki AI</Text>
      </div>

      <Form layout="vertical" onFinish={onFinish} size="large" autoComplete="off">
        <Form.Item
          name="displayName"
          rules={[{ required: true, message: 'Please enter your name' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Display Name" />
        </Form.Item>

        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email" />
        </Form.Item>

        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Please enter a password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Create Account
          </Button>
        </Form.Item>
      </Form>

      <Divider plain>
        <Text type="secondary" style={{ fontSize: 13 }}>
          or
        </Text>
      </Divider>

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Already have an account?{' '}
          <Link href="/login">
            <strong>Sign In</strong>
          </Link>
        </Text>
      </div>
    </Card>
  );
}
