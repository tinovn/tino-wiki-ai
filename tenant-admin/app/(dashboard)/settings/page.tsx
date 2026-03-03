'use client';

import { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Switch, Button, Typography, Space, Divider, App, Spin } from 'antd';
import PageHeader from '@/components/layout/PageHeader';
import { useAuth } from '@/providers/AuthProvider';
import { aiService } from '@/services/ai.service';

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [loadingAi, setLoadingAi] = useState(true);
  const [allowGeneralKnowledge, setAllowGeneralKnowledge] = useState(false);
  const [savingAi, setSavingAi] = useState(false);

  useEffect(() => {
    aiService.getSettings()
      .then((settings) => {
        setAllowGeneralKnowledge(settings.allowGeneralKnowledge);
      })
      .catch(() => {})
      .finally(() => setLoadingAi(false));
  }, []);

  const handleToggleGeneralKnowledge = async (checked: boolean) => {
    setSavingAi(true);
    try {
      await aiService.updateSettings({ allowGeneralKnowledge: checked });
      setAllowGeneralKnowledge(checked);
      message.success(checked
        ? 'AI sẽ sử dụng kiến thức chung khi không tìm thấy trong tài liệu'
        : 'AI chỉ trả lời dựa trên tài liệu đã publish'
      );
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingAi(false);
    }
  };

  const handleSave = () => {
    message.success('Settings saved (local only)');
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Cấu hình hệ thống" />

      <section className="main-grid">
        <Card title="Cấu hình chung" size="small">
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

            <Form.Item label="Ngôn ngữ" name="language" initialValue="vi">
              <Select>
                <Select.Option value="vi">Tiếng Việt</Select.Option>
                <Select.Option value="en">English</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Lưu thay đổi
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Cấu hình AI" size="small">
          {loadingAi ? (
            <Spin />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Title level={5} style={{ margin: 0 }}>Cho phép kiến thức chung</Title>
                <Text type="secondary">
                  Khi bật: AI sẽ trả lời từ kiến thức chung nếu không tìm thấy trong tài liệu (có ghi chú cảnh báo).
                  Khi tắt: AI chỉ trả lời dựa trên tài liệu đã publish trong hệ thống.
                </Text>
                <br />
                <Switch
                  checked={allowGeneralKnowledge}
                  onChange={handleToggleGeneralKnowledge}
                  loading={savingAi}
                  style={{ marginTop: 8 }}
                />
                <Text style={{ marginLeft: 8 }}>
                  {allowGeneralKnowledge ? 'Đang bật' : 'Đang tắt'}
                </Text>
              </div>
              <Divider style={{ margin: 0 }} />
              <div>
                <Title level={5} style={{ margin: 0 }}>Tự động xử lý AI</Title>
                <Text type="secondary">Tự động chạy AI pipeline khi tài liệu được publish</Text>
                <br />
                <Switch defaultChecked style={{ marginTop: 8 }} />
              </div>
            </Space>
          )}
        </Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <Card title="Thông tin tài khoản" size="small">
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
