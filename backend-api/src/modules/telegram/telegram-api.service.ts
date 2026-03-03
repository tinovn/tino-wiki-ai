import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly BASE_URL = 'https://api.telegram.org';

  async sendMessage(botToken: string, chatId: number, text: string): Promise<void> {
    const chunks = this.splitMessage(text);

    for (const chunk of chunks) {
      try {
        const response = await fetch(`${this.BASE_URL}/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          // Retry without parse_mode if Markdown parsing fails
          if (response.status === 400 && err.includes("can't parse")) {
            await fetch(`${this.BASE_URL}/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: chunk,
              }),
            });
          } else {
            this.logger.error(`Telegram send failed: ${response.status} ${err}`);
          }
        }
      } catch (error) {
        this.logger.error(`Telegram send error: ${error}`);
      }
    }
  }

  async sendChatAction(botToken: string, chatId: number, action = 'typing'): Promise<void> {
    try {
      await fetch(`${this.BASE_URL}/bot${botToken}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action }),
      });
    } catch {
      // ignore typing indicator errors
    }
  }

  async setWebhook(botToken: string, url: string, secretToken?: string): Promise<{ ok: boolean; description?: string }> {
    const body: Record<string, any> = { url };
    if (secretToken) body.secret_token = secretToken;

    const response = await fetch(`${this.BASE_URL}/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json() as Promise<{ ok: boolean; description?: string }>;
  }

  async deleteWebhook(botToken: string): Promise<{ ok: boolean; description?: string }> {
    const response = await fetch(`${this.BASE_URL}/bot${botToken}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    return response.json() as Promise<{ ok: boolean; description?: string }>;
  }

  async getMe(botToken: string): Promise<{ ok: boolean; result?: { id: number; username: string; first_name: string } }> {
    const response = await fetch(`${this.BASE_URL}/bot${botToken}/getMe`);
    return response.json() as Promise<any>;
  }

  private splitMessage(text: string, limit = 4096): string[] {
    if (text.length <= limit) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > limit) {
      let split = remaining.lastIndexOf('\n', limit);
      if (split < limit / 2) split = remaining.lastIndexOf(' ', limit);
      if (split <= 0) split = limit;

      chunks.push(remaining.slice(0, split).trim());
      remaining = remaining.slice(split).trim();
    }

    if (remaining) chunks.push(remaining);
    return chunks;
  }
}
