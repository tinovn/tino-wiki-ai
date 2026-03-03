"use client";

import { useEffect, useState } from "react";
import { Card, Form, Input, Button, Select, Spin, Row, Col, Divider, message, Tag } from "antd";
import PageHeader from "@/components/PageHeader";
import { getLlmSettings, updateLlmSettings } from "@/lib/master-api";

const providers = [
  { value: "vllm", label: "vLLM (Local)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "ollama", label: "Ollama (Local)" },
];

const embeddingProviders = [
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama" },
  { value: "vllm", label: "vLLM" },
];

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res: any = await getLlmSettings();
      setConfig(res.data);
      form.setFieldsValue({
        defaultProvider: res.data.defaultProvider,
        vllmBaseUrl: res.data.vllm?.baseUrl,
        vllmModel: res.data.vllm?.model,
        vllmApiKey: "",
        openaiApiKey: "",
        openaiChatModel: res.data.openai?.chatModel,
        openaiEmbeddingModel: res.data.openai?.embeddingModel,
        anthropicApiKey: "",
        anthropicModel: res.data.anthropic?.model,
        ollamaBaseUrl: res.data.ollama?.baseUrl,
        ollamaChatModel: res.data.ollama?.chatModel,
        ollamaEmbeddingModel: res.data.ollama?.embeddingModel,
        embeddingProvider: res.data.embedding?.provider,
        embeddingDimensions: String(res.data.embedding?.dimensions || 1536),
      });
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      // Only send non-empty values
      const data: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v && String(v).trim()) data[k] = String(v);
      }
      await updateLlmSettings(data);
      message.success("Đã lưu cấu hình. Restart server để áp dụng hoàn toàn.");
      loadConfig();
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: "block", margin: "100px auto" }} />;

  return (
    <>
      <PageHeader title="Cài đặt AI" subtitle="Cấu hình LLM providers và embedding" />
      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Row gutter={[16, 16]}>
          {/* Default Provider */}
          <Col span={24}>
            <Card title="Provider mặc định">
              <Form.Item name="defaultProvider" label="LLM Provider">
                <Select options={providers} />
              </Form.Item>
              <Form.Item name="embeddingProvider" label="Embedding Provider">
                <Select options={embeddingProviders} />
              </Form.Item>
              <Form.Item name="embeddingDimensions" label="Embedding Dimensions">
                <Input type="number" />
              </Form.Item>
            </Card>
          </Col>

          {/* vLLM */}
          <Col xs={24} md={12}>
            <Card
              title={<>vLLM {config?.defaultProvider === "vllm" && <Tag color="green">Active</Tag>}</>}
              size="small"
            >
              <Form.Item name="vllmBaseUrl" label="Base URL">
                <Input placeholder="http://localhost:8000/v1" />
              </Form.Item>
              <Form.Item name="vllmModel" label="Model">
                <Input placeholder="Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4" />
              </Form.Item>
              <Form.Item name="vllmApiKey" label={<>API Key {config?.vllm?.apiKey && <Tag>{config.vllm.apiKey}</Tag>}</>}>
                <Input.Password placeholder="Để trống nếu không đổi" />
              </Form.Item>
            </Card>
          </Col>

          {/* OpenAI */}
          <Col xs={24} md={12}>
            <Card
              title={<>OpenAI {config?.defaultProvider === "openai" && <Tag color="green">Active</Tag>}</>}
              size="small"
            >
              <Form.Item name="openaiApiKey" label={<>API Key {config?.openai?.apiKey && <Tag>{config.openai.apiKey}</Tag>}</>}>
                <Input.Password placeholder="sk-..." />
              </Form.Item>
              <Form.Item name="openaiChatModel" label="Chat Model">
                <Input placeholder="gpt-4o-mini" />
              </Form.Item>
              <Form.Item name="openaiEmbeddingModel" label="Embedding Model">
                <Input placeholder="text-embedding-3-small" />
              </Form.Item>
            </Card>
          </Col>

          {/* Anthropic */}
          <Col xs={24} md={12}>
            <Card
              title={<>Anthropic {config?.defaultProvider === "anthropic" && <Tag color="green">Active</Tag>}</>}
              size="small"
            >
              <Form.Item name="anthropicApiKey" label={<>API Key {config?.anthropic?.apiKey && <Tag>{config.anthropic.apiKey}</Tag>}</>}>
                <Input.Password placeholder="sk-ant-..." />
              </Form.Item>
              <Form.Item name="anthropicModel" label="Model">
                <Input placeholder="claude-sonnet-4-20250514" />
              </Form.Item>
            </Card>
          </Col>

          {/* Ollama */}
          <Col xs={24} md={12}>
            <Card
              title={<>Ollama {config?.defaultProvider === "ollama" && <Tag color="green">Active</Tag>}</>}
              size="small"
            >
              <Form.Item name="ollamaBaseUrl" label="Base URL">
                <Input placeholder="http://localhost:11434" />
              </Form.Item>
              <Form.Item name="ollamaChatModel" label="Chat Model">
                <Input placeholder="llama3.1" />
              </Form.Item>
              <Form.Item name="ollamaEmbeddingModel" label="Embedding Model">
                <Input placeholder="nomic-embed-text" />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Divider />
        <Button type="primary" htmlType="submit" loading={saving} size="large">
          Lưu cấu hình
        </Button>
      </Form>
    </>
  );
}
