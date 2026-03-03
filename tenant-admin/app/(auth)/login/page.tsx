'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Typography, App, Divider } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values);
      message.success('Logged in successfully');
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Login failed. Please check your credentials.');
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
          Tino Wiki AI
        </Title>
        <Text type="secondary">Sign in to your account</Text>
      </div>

      <Form layout="vertical" onFinish={onFinish} size="large" autoComplete="off">
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
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Sign In
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
          Don&apos;t have an account?{' '}
          <Link href="/register">
            <strong>Register</strong>
          </Link>
        </Text>
      </div>
    </Card>
  );
}
