'use client';

import { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Switch, Button, Typography, Space, Divider, App, Spin, Tabs } from 'antd';
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

  const [loadingMessages, setLoadingMessages] = useState(true);
  const [savingMessages, setSavingMessages] = useState(false);
  const [messages, setMessages] = useState<{
    global: Record<string, string>;
    messenger: Record<string, string>;
    telegram: Record<string, string>;
    chatwidget: Record<string, string>;
    defaults: Record<string, string>;
  }>({ global: {}, messenger: {}, telegram: {}, chatwidget: {}, defaults: {} });

  const MESSAGE_LABELS: Record<string, string> = {
    welcomeMessage: 'Lời chào (khách mới)',
    welcomeBackMessage: 'Lời chào (khách quay lại)',
    reopenMessage: 'Mở lại hội thoại',
    closedMessage: 'Đóng hội thoại',
    handoffMessage: 'Chuyển tiếp nhân viên',
    aiUnavailableMessage: 'AI không khả dụng',
    outsideHoursMessage: 'Ngoài giờ làm việc',
    resumeAiMessage: 'Chuyển lại cho AI',
  };

  const MESSAGE_KEYS = Object.keys(MESSAGE_LABELS);

  useEffect(() => {
    aiService.getSettings()
      .then((settings) => {
        setAllowGeneralKnowledge(settings.allowGeneralKnowledge);
      })
      .catch(() => {})
      .finally(() => setLoadingAi(false));

    aiService.getMessages()
      .then((data) => setMessages(data))
      .catch(() => {})
      .finally(() => setLoadingMessages(false));
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

  const handleSaveMessages = async () => {
    setSavingMessages(true);
    try {
      await aiService.updateMessages({
        global: messages.global,
        messenger: messages.messenger,
        telegram: messages.telegram,
        chatwidget: messages.chatwidget,
      });
      message.success('Đã lưu tin nhắn tự động');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingMessages(false);
    }
  };

  const updateMessage = (scope: 'global' | 'messenger' | 'telegram' | 'chatwidget', key: string, value: string) => {
    setMessages((prev) => ({
      ...prev,
      [scope]: { ...prev[scope], [key]: value },
    }));
  };

  const getPlaceholder = (scope: string, key: string): string => {
    if (scope === 'global') return messages.defaults[key] || '';
    return messages.global[key] || messages.defaults[key] || '';
  };

  const renderMessageFields = (scope: 'global' | 'messenger' | 'telegram' | 'chatwidget') => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {MESSAGE_KEYS.map((key) => (
        <div key={key}>
          <Text strong>{MESSAGE_LABELS[key]}</Text>
          {scope !== 'global' && (
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              Để trống = dùng giá trị mặc định
            </Text>
          )}
          <Input.TextArea
            rows={2}
            value={messages[scope][key] || ''}
            placeholder={getPlaceholder(scope, key)}
            onChange={(e) => updateMessage(scope, key, e.target.value)}
            style={{ marginTop: 4 }}
          />
        </div>
      ))}
    </Space>
  );

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
        <Card title="Tin nhắn tự động" size="small">
          {loadingMessages ? (
            <Spin />
          ) : (
            <>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Cấu hình nội dung tin nhắn hệ thống. Tab &quot;Mặc định&quot; áp dụng cho tất cả kênh.
                Các tab kênh cho phép override riêng — để trống sẽ dùng giá trị mặc định.
              </Text>
              <Tabs
                items={[
                  { key: 'global', label: 'Mặc định', children: renderMessageFields('global') },
                  { key: 'messenger', label: 'Messenger', children: renderMessageFields('messenger') },
                  { key: 'telegram', label: 'Telegram', children: renderMessageFields('telegram') },
                  { key: 'chatwidget', label: 'Chat Widget', children: renderMessageFields('chatwidget') },
                ]}
              />
              <Button
                type="primary"
                onClick={handleSaveMessages}
                loading={savingMessages}
                style={{ marginTop: 16 }}
              >
                Lưu thay đổi
              </Button>
            </>
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
