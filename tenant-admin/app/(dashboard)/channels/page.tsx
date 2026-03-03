'use client';

import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Divider, App, Spin, Tag, Alert } from 'antd';
import { SendOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import { channelsService, type MessengerConfig, type TelegramConfig } from '@/services/channels.service';

const { Title, Text } = Typography;

export default function ChannelsPage() {
  const { message } = App.useApp();
  const [messengerForm] = Form.useForm();
  const [telegramForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [savingMessenger, setSavingMessenger] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [settingUpWebhook, setSettingUpWebhook] = useState(false);

  const [messengerConfig, setMessengerConfig] = useState<MessengerConfig | null>(null);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [webhookBaseUrl, setWebhookBaseUrl] = useState(process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || '');

  useEffect(() => {
    channelsService.getChannels()
      .then((config) => {
        setMessengerConfig(config.messenger);
        setTelegramConfig(config.telegram);
        if (config.messenger) messengerForm.setFieldsValue(config.messenger);
        if (config.telegram) telegramForm.setFieldsValue(config.telegram);
      })
      .catch(() => message.error('Không thể tải cấu hình kênh chat'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveMessenger = async (values: MessengerConfig) => {
    setSavingMessenger(true);
    try {
      const result = await channelsService.updateChannels({ messenger: values });
      setMessengerConfig(result.messenger);
      message.success('Đã lưu cấu hình Facebook Messenger');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingMessenger(false);
    }
  };

  const handleDisableMessenger = async () => {
    setSavingMessenger(true);
    try {
      const result = await channelsService.updateChannels({ messenger: null });
      setMessengerConfig(result.messenger);
      messengerForm.resetFields();
      message.success('Đã tắt Facebook Messenger');
    } catch {
      message.error('Thao tác thất bại');
    } finally {
      setSavingMessenger(false);
    }
  };

  const handleSaveTelegram = async (values: TelegramConfig) => {
    setSavingTelegram(true);
    try {
      const result = await channelsService.updateChannels({ telegram: values });
      setTelegramConfig(result.telegram);
      message.success('Đã lưu cấu hình Telegram Bot');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleDisableTelegram = async () => {
    setSavingTelegram(true);
    try {
      const result = await channelsService.updateChannels({ telegram: null });
      setTelegramConfig(result.telegram);
      telegramForm.resetFields();
      message.success('Đã tắt Telegram Bot');
    } catch {
      message.error('Thao tác thất bại');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleSetupTelegramWebhook = async () => {
    if (!webhookBaseUrl) {
      message.error('Vui lòng nhập Public URL (ngrok URL) trước');
      return;
    }
    setSettingUpWebhook(true);
    try {
      const result = await channelsService.setupTelegramWebhook('tino', webhookBaseUrl);
      if (result.ok) {
        message.success('Đã đăng ký webhook Telegram thành công');
      } else {
        message.error(`Lỗi: ${result.description || 'Unknown error'}`);
      }
    } catch {
      message.error('Không thể đăng ký webhook. Kiểm tra URL và bot token.');
    } finally {
      setSettingUpWebhook(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Channels" subtitle="Cấu hình kênh chat tích hợp AI" />
        <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Channels" subtitle="Cấu hình kênh chat tích hợp AI" />

      <section className="settings-grid">
        {/* Facebook Messenger */}
        <Card
          title={
            <Space>
              <span>Facebook Messenger</span>
              {messengerConfig
                ? <Tag color="success" icon={<CheckCircleOutlined />}>Đang hoạt động</Tag>
                : <Tag color="default" icon={<CloseCircleOutlined />}>Chưa cấu hình</Tag>
              }
            </Space>
          }
          size="small"
        >
          <Form form={messengerForm} layout="vertical" onFinish={handleSaveMessenger}>
            <Form.Item
              label="Page ID"
              name="pageId"
              rules={[{ required: true, message: 'Nhập Page ID' }]}
            >
              <Input placeholder="Ví dụ: 123456789012345" />
            </Form.Item>

            <Form.Item
              label="Page Access Token"
              name="pageAccessToken"
              rules={[{ required: true, message: 'Nhập Page Access Token' }]}
            >
              <Input.Password placeholder="EAAB..." />
            </Form.Item>

            <Form.Item
              label="App Secret"
              name="appSecret"
              rules={[{ required: true, message: 'Nhập App Secret' }]}
            >
              <Input.Password placeholder="App secret từ Facebook Developer Console" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={savingMessenger}>
                  Lưu cấu hình
                </Button>
                {messengerConfig && (
                  <Button danger onClick={handleDisableMessenger} loading={savingMessenger}>
                    Tắt kênh
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>

          {messengerConfig && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Alert
                type="info"
                showIcon
                message="Webhook URL"
                description={
                  <Text copyable code style={{ fontSize: 12 }}>
                    {`${process.env.NEXT_PUBLIC_API_URL || ''}/webhooks/messenger`}
                  </Text>
                }
              />
            </>
          )}
        </Card>

        {/* Telegram Bot */}
        <Card
          title={
            <Space>
              <span>Telegram Bot</span>
              {telegramConfig
                ? <Tag color="success" icon={<CheckCircleOutlined />}>Đang hoạt động</Tag>
                : <Tag color="default" icon={<CloseCircleOutlined />}>Chưa cấu hình</Tag>
              }
            </Space>
          }
          size="small"
        >
          <Form form={telegramForm} layout="vertical" onFinish={handleSaveTelegram}>
            <Form.Item
              label="Bot Token"
              name="botToken"
              rules={[{ required: true, message: 'Nhập Bot Token' }]}
              extra="Lấy từ @BotFather trên Telegram"
            >
              <Input.Password placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz" />
            </Form.Item>

            <Form.Item
              label="Bot Username"
              name="botUsername"
              extra="Username của bot (không bắt buộc)"
            >
              <Input placeholder="my_company_bot" addonBefore="@" />
            </Form.Item>

            <Form.Item
              label="Webhook Secret"
              name="webhookSecret"
              extra="Chuỗi bảo mật tuỳ chọn để xác thực webhook"
            >
              <Input.Password placeholder="my-random-secret-123" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={savingTelegram}>
                  Lưu cấu hình
                </Button>
                {telegramConfig && (
                  <Button danger onClick={handleDisableTelegram} loading={savingTelegram}>
                    Tắt kênh
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>

          {telegramConfig && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ display: 'block', marginBottom: 4 }}>Public URL (ngrok)</Text>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                  URL công khai để Telegram gửi webhook. Dùng ngrok nếu đang dev local.
                </Text>
                <Input
                  placeholder="https://abc123.ngrok-free.app"
                  value={webhookBaseUrl}
                  onChange={(e) => setWebhookBaseUrl(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Button
                  icon={<SendOutlined />}
                  onClick={handleSetupTelegramWebhook}
                  loading={settingUpWebhook}
                >
                  Đăng ký Webhook
                </Button>
              </div>
              <Alert
                type="info"
                showIcon
                message="Hướng dẫn"
                description={
                  <ol style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    <li>Nhập Bot Token từ @BotFather</li>
                    <li>Lưu cấu hình</li>
                    <li>Nhập Public URL (ngrok) và bấm &quot;Đăng ký Webhook&quot;</li>
                    <li>Gửi tin nhắn cho bot trên Telegram để test</li>
                  </ol>
                }
              />
            </>
          )}
        </Card>
      </section>
    </>
  );
}
