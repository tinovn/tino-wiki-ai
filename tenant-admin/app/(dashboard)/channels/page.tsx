'use client';

import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Typography, Space, Divider, App, Spin, Tag, Alert, Switch, Select, ColorPicker } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, CopyOutlined, KeyOutlined } from '@ant-design/icons';
import PageHeader from '@/components/layout/PageHeader';
import { channelsService, type MessengerConfig, type TelegramConfig, type ChatWidgetConfig } from '@/services/channels.service';

const { Text, Paragraph } = Typography;

export default function ChannelsPage() {
  const { message } = App.useApp();
  const [messengerForm] = Form.useForm();
  const [telegramForm] = Form.useForm();
  const [widgetForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [savingMessenger, setSavingMessenger] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingWidget, setSavingWidget] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  const [messengerConfig, setMessengerConfig] = useState<MessengerConfig | null>(null);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<ChatWidgetConfig | null>(null);

  useEffect(() => {
    channelsService.getChannels()
      .then((config) => {
        setMessengerConfig(config.messenger);
        setTelegramConfig(config.telegram);
        setWidgetConfig(config.chatwidget);
        if (config.messenger) messengerForm.setFieldsValue(config.messenger);
        if (config.telegram) telegramForm.setFieldsValue(config.telegram);
        if (config.chatwidget) {
          widgetForm.setFieldsValue({
            ...config.chatwidget,
            primaryColor: config.chatwidget.theme?.primaryColor || '#1890ff',
            position: config.chatwidget.theme?.position || 'bottom-right',
          });
        }
      })
      .catch(() => message.error('Không thể tải cấu hình kênh chat'))
      .finally(() => setLoading(false));
  }, []);

  // --- Messenger handlers ---
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

  // --- Telegram handlers ---
  const handleSaveTelegram = async (values: TelegramConfig) => {
    setSavingTelegram(true);
    try {
      const result = await channelsService.updateChannels({ telegram: values });
      setTelegramConfig(result.telegram);
      message.success('Đã lưu cấu hình Telegram Bot. Bot sẽ tự động kết nối khi server khởi động lại.');
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

  // --- Chat Widget handlers ---
  const handleSaveWidget = async (values: any) => {
    setSavingWidget(true);
    try {
      const colorValue = typeof values.primaryColor === 'string'
        ? values.primaryColor
        : values.primaryColor?.toHexString?.() || '#1890ff';

      const config: ChatWidgetConfig = {
        enabled: values.enabled ?? true,
        widgetToken: widgetConfig?.widgetToken,
        theme: {
          primaryColor: colorValue,
          position: values.position || 'bottom-right',
        },
        welcomeMessage: values.welcomeMessage || 'Xin chào! Tôi có thể giúp gì cho bạn?',
        placeholder: values.placeholder || 'Nhập câu hỏi...',
        title: values.title || 'Hỗ trợ AI',
      };

      const result = await channelsService.updateChannels({ chatwidget: config });
      setWidgetConfig(result.chatwidget);
      message.success('Đã lưu cấu hình Chat Widget');
    } catch {
      message.error('Lưu thất bại');
    } finally {
      setSavingWidget(false);
    }
  };

  const handleDisableWidget = async () => {
    setSavingWidget(true);
    try {
      const result = await channelsService.updateChannels({ chatwidget: null });
      setWidgetConfig(result.chatwidget);
      widgetForm.resetFields();
      message.success('Đã tắt Chat Widget');
    } catch {
      message.error('Thao tác thất bại');
    } finally {
      setSavingWidget(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const result = await channelsService.generateWidgetToken();
      setWidgetConfig((prev) => prev ? { ...prev, widgetToken: result.widgetToken } : null);
      message.success('Đã tạo token mới');
    } catch {
      message.error('Không thể tạo token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const maskToken = (token?: string) => {
    if (!token) return '';
    return token.slice(0, 8) + '...' + token.slice(-6);
  };

  const embedCode = widgetConfig?.widgetToken
    ? `<script src="${window.location.origin}/widget.js" data-token="${widgetConfig.widgetToken}" data-api="${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}"></script>`
    : '';

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
              <Alert
                type="info"
                showIcon
                message="Chế độ Polling"
                description="Bot tự động kết nối Telegram khi server khởi động. Không cần cấu hình webhook hay ngrok."
              />
            </>
          )}
        </Card>

        {/* Chat Widget */}
        <Card
          title={
            <Space>
              <span>Chat Widget</span>
              {widgetConfig?.enabled
                ? <Tag color="success" icon={<CheckCircleOutlined />}>Đang hoạt động</Tag>
                : <Tag color="default" icon={<CloseCircleOutlined />}>Chưa cấu hình</Tag>
              }
            </Space>
          }
          size="small"
        >
          <Form
            form={widgetForm}
            layout="vertical"
            onFinish={handleSaveWidget}
            initialValues={{
              enabled: true,
              primaryColor: '#1890ff',
              position: 'bottom-right',
              welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
              placeholder: 'Nhập câu hỏi...',
              title: 'Hỗ trợ AI',
            }}
          >
            <Form.Item label="Bật/Tắt" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Form.Item label="Tiêu đề widget" name="title">
              <Input placeholder="Hỗ trợ AI" />
            </Form.Item>

            <Form.Item label="Lời chào" name="welcomeMessage">
              <Input.TextArea rows={2} placeholder="Xin chào! Tôi có thể giúp gì cho bạn?" />
            </Form.Item>

            <Form.Item label="Placeholder" name="placeholder">
              <Input placeholder="Nhập câu hỏi..." />
            </Form.Item>

            <Form.Item label="Màu chủ đạo" name="primaryColor">
              <ColorPicker format="hex" />
            </Form.Item>

            <Form.Item label="Vị trí" name="position">
              <Select
                options={[
                  { label: 'Dưới phải', value: 'bottom-right' },
                  { label: 'Dưới trái', value: 'bottom-left' },
                ]}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={savingWidget}>
                  Lưu cấu hình
                </Button>
                {widgetConfig && (
                  <Button danger onClick={handleDisableWidget} loading={savingWidget}>
                    Tắt kênh
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>

          <Divider style={{ margin: '12px 0' }} />

          {/* Token management */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Button
                icon={<KeyOutlined />}
                onClick={handleGenerateToken}
                loading={generatingToken}
              >
                {widgetConfig?.widgetToken ? 'Tạo lại token' : 'Tạo token'}
              </Button>
              {widgetConfig?.widgetToken && (
                <Text code copyable={{ text: widgetConfig.widgetToken }}>
                  {maskToken(widgetConfig.widgetToken)}
                </Text>
              )}
            </Space>

            {widgetConfig?.widgetToken && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Alert
                  type="info"
                  showIcon
                  message="Embed Code"
                  description={
                    <Paragraph
                      copyable={{ text: embedCode, icon: <CopyOutlined /> }}
                      code
                      style={{ fontSize: 12, marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                    >
                      {embedCode}
                    </Paragraph>
                  }
                />
              </>
            )}
          </Space>
        </Card>
      </section>
    </>
  );
}
