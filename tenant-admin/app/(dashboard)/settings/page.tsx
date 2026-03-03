'use client';

import { Card, Form, Input, Select, Switch, Button, Typography, Space, Divider, App } from 'antd';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/providers/AuthProvider';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const handleSave = () => {
    message.success('Settings saved (local only)');
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="System configuration" />

      <section className="main-grid">
        <Card title="System Setup" size="small">
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item label="Workspace Name" name="workspace" initialValue="Tino Wiki AI">
              <Input />
            </Form.Item>

            <Form.Item label="Timezone" name="timezone" initialValue="Asia/Ho_Chi_Minh">
              <Select>
                <Select.Option value="Asia/Ho_Chi_Minh">Asia/Ho Chi Minh (UTC+7)</Select.Option>
                <Select.Option value="UTC">UTC</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="Language" name="language" initialValue="en">
              <Select>
                <Select.Option value="en">English</Select.Option>
                <Select.Option value="vi">Vietnamese</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Operations" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Title level={5} style={{ margin: 0 }}>Auto AI Processing</Title>
              <Text type="secondary">Automatically process documents when published</Text>
              <br />
              <Switch defaultChecked style={{ marginTop: 8 }} />
            </div>
            <Divider style={{ margin: 0 }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>Email Alerts</Title>
              <Text type="secondary">Send alerts for failed queries and system errors</Text>
              <br />
              <Switch defaultChecked style={{ marginTop: 8 }} />
            </div>
            <Divider style={{ margin: 0 }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>Fallback Responses</Title>
              <Text type="secondary">Return a default message when AI cannot find an answer</Text>
              <br />
              <Switch style={{ marginTop: 8 }} />
            </div>
          </Space>
        </Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <Card title="Account Info" size="small">
          <Space direction="vertical">
            <Text><strong>Email:</strong> {user?.email ?? '-'}</Text>
            <Text><strong>Role:</strong> {user?.role ?? '-'}</Text>
            <Text><strong>Tenant:</strong> {user?.tenantId ?? '-'}</Text>
          </Space>
        </Card>
      </section>
    </>
  );
}
