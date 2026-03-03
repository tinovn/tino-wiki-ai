import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FacebookApiService {
  private readonly logger = new Logger(FacebookApiService.name);
  private readonly FB_API = 'https://graph.facebook.com/v19.0';

  async sendMessage(recipientId: string, text: string, pageAccessToken: string): Promise<void> {
    const chunks = this.splitMessage(text);

    for (const chunk of chunks) {
      try {
        const response = await fetch(`${this.FB_API}/me/messages?access_token=${pageAccessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: chunk },
            messaging_type: 'RESPONSE',
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          this.logger.error(`FB send failed: ${response.status} ${err}`);
        }
      } catch (error) {
        this.logger.error(`FB send error: ${error}`);
      }
    }
  }

  async sendTypingOn(recipientId: string, pageAccessToken: string): Promise<void> {
    try {
      await fetch(`${this.FB_API}/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          sender_action: 'typing_on',
        }),
      });
    } catch {
      // ignore typing indicator errors
    }
  }

  private splitMessage(text: string, limit = 2000): string[] {
    if (text.length <= limit) return [text];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > limit) {
      // Try to split at newline first, then space
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
