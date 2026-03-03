export interface InitSessionResponse {
  sessionId: string;
  config: {
    theme: { primaryColor: string; position: string };
    welcomeMessage: string;
    placeholder: string;
    title: string;
  };
  history: Array<{ role: string; content: string; createdAt: string }>;
}

export interface MessageResponse {
  answer: string;
  sources?: Array<{ documentId: string; heading?: string; layer: string; score: number }>;
  confidence?: number;
  latencyMs?: number;
}

export interface StreamChunk {
  content: string;
  isLast: boolean;
}

export class WidgetApi {
  constructor(
    private apiUrl: string,
    private token: string,
  ) {}

  private async request<T>(path: string, method: string, body?: any): Promise<T> {
    const res = await fetch(`${this.apiUrl}/widget/chat${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-widget-token': this.token,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Widget API error ${res.status}: ${text}`);
    }
    const json = await res.json();
    return json.data;
  }

  async init(sessionId?: string): Promise<InitSessionResponse> {
    return this.request('/init', 'POST', { sessionId });
  }

  async sendMessage(sessionId: string, message: string): Promise<MessageResponse> {
    return this.request('/message', 'POST', { sessionId, message });
  }

  async *sendMessageStream(
    sessionId: string,
    message: string,
  ): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.apiUrl}/widget/chat/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-widget-token': this.token,
      },
      body: JSON.stringify({ sessionId, message }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Stream error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;
        try {
          yield JSON.parse(payload) as StreamChunk;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  async getHistory(
    sessionId: string,
  ): Promise<Array<{ role: string; content: string; createdAt: string }>> {
    return this.request(`/history/${sessionId}`, 'GET');
  }
}
