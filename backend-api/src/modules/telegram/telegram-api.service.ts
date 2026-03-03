import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly BASE_URL = 'https://api.telegram.org';

  /**
   * Send a formatted message via bot instance.
   * Converts Markdown → Telegram HTML, splits long messages, fallback to plain text.
   */
  async sendMessage(bot: TelegramBot, chatId: number, text: string): Promise<void> {
    const html = this.markdownToTelegramHtml(text);
    const chunks = this.splitMessage(html);

    for (const chunk of chunks) {
      try {
        await bot.sendMessage(chatId, chunk, { parse_mode: 'HTML' });
      } catch (err: any) {
        // Retry without parse_mode if HTML parsing fails
        if (err.response?.statusCode === 400) {
          this.logger.warn(`Telegram HTML parse failed, retrying plain text`);
          try {
            await bot.sendMessage(chatId, this.stripMarkdown(text));
          } catch {
            // ignore fallback error
          }
        } else {
          this.logger.error(`Telegram send error: ${err.message}`);
        }
      }
    }
  }

  async deleteWebhook(botToken: string): Promise<void> {
    try {
      await fetch(`${this.BASE_URL}/bot${botToken}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // ignore
    }
  }

  /**
   * Convert standard Markdown to Telegram-supported HTML.
   * Telegram HTML supports: <b>, <i>, <u>, <s>, <code>, <pre>, <a>, <blockquote>
   */
  private markdownToTelegramHtml(md: string): string {
    let html = md;

    // Code blocks: ```lang\n...\n``` → <pre><code class="language-lang">...</code></pre>
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const escaped = this.escapeHtml(code.trimEnd());
      return lang
        ? `<pre><code class="language-${lang}">${escaped}</code></pre>`
        : `<pre>${escaped}</pre>`;
    });

    // Inline code: `...` → <code>...</code>
    html = html.replace(/`([^`]+)`/g, (_, code) => `<code>${this.escapeHtml(code)}</code>`);

    // Headings: ## Text → <b>Text</b>
    html = html.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');

    // Bold: **text** → <b>text</b>
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

    // Italic: *text* → <i>text</i>
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');

    // Strikethrough: ~~text~~ → <s>text</s>
    html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');

    // Links: [text](url) → <a href="url">text</a>
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Blockquotes: > text → <blockquote>text</blockquote>
    html = html.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Unordered lists: - item → • item
    html = html.replace(/^[-*]\s+/gm, '• ');

    // Horizontal rule: --- → ———
    html = html.replace(/^-{3,}$/gm, '———');

    return html.trim();
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^>\s?/gm, '')
      .replace(/^[-*]\s+/gm, '• ')
      .trim();
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
