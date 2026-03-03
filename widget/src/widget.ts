import { WidgetApi, type InitSessionResponse } from './api';

interface WidgetOptions {
  token: string;
  apiUrl: string;
}

interface Message {
  role: string;
  content: string;
}

const STORAGE_KEY = 'tino_widget_session';

const DEFAULT_CONFIG = {
  theme: { primaryColor: '#1890ff', position: 'bottom-right' },
  welcomeMessage: 'Xin chào! Tôi có thể giúp gì cho bạn?',
  placeholder: 'Nhập câu hỏi...',
  title: 'Hỗ trợ AI',
};

export class TinoWidget {
  private api: WidgetApi;
  private sessionId: string | null = null;
  private config: InitSessionResponse['config'] = DEFAULT_CONFIG;
  private messages: Message[] = [];
  private isOpen = false;
  private isSending = false;
  private initialized = false;

  // DOM refs
  private root: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private panel: HTMLElement | null = null;
  private messageList: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private bubble: HTMLElement | null = null;

  constructor(opts: WidgetOptions) {
    this.api = new WidgetApi(opts.apiUrl, opts.token);
    this.sessionId = this.loadSession();
  }

  async mount() {
    // Create host element
    this.root = document.createElement('div');
    this.root.id = 'tino-widget-root';
    document.body.appendChild(this.root);

    // Attach shadow DOM
    this.shadow = this.root.attachShadow({ mode: 'closed' });

    // Render UI immediately with default config (bubble always visible)
    this.render();

    // Try to init session in background (non-blocking)
    this.initSession();
  }

  private async initSession() {
    try {
      const result = await this.api.init(this.sessionId || undefined);
      this.sessionId = result.sessionId;
      this.config = result.config;
      this.messages = result.history.map((h) => ({
        role: h.role,
        content: h.content,
      }));
      this.saveSession(this.sessionId);
      this.initialized = true;

      // Re-render panel with server config
      this.updatePanelConfig();
    } catch (err) {
      console.warn('[TinoWidget] Init failed, will retry on open:', err);
    }
  }

  private render() {
    if (!this.shadow) return;

    const color = this.config.theme.primaryColor || '#1890ff';
    const position = this.config.theme.position || 'bottom-right';
    const isRight = position === 'bottom-right';

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles(color, isRight);
    this.shadow.appendChild(style);

    // Bubble button
    this.bubble = document.createElement('div');
    this.bubble.className = 'tw-bubble';
    this.bubble.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="white"/></svg>`;
    this.bubble.addEventListener('click', () => this.toggle());
    this.shadow.appendChild(this.bubble);

    // Chat panel
    this.panel = document.createElement('div');
    this.panel.className = 'tw-panel tw-hidden';
    this.panel.innerHTML = `
      <div class="tw-header">
        <span class="tw-title">${this.escapeHtml(this.config.title)}</span>
        <button class="tw-close">&times;</button>
      </div>
      <div class="tw-messages"></div>
      <div class="tw-input-bar">
        <textarea class="tw-input" placeholder="${this.escapeHtml(this.config.placeholder)}" rows="1"></textarea>
        <button class="tw-send">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="${color}"/></svg>
        </button>
      </div>
    `;
    this.shadow.appendChild(this.panel);

    // Refs
    this.messageList = this.panel.querySelector('.tw-messages')!;
    this.inputEl = this.panel.querySelector('.tw-input')!;
    this.sendBtn = this.panel.querySelector('.tw-send')!;
    const closeBtn = this.panel.querySelector('.tw-close')!;

    // Events
    closeBtn.addEventListener('click', () => this.toggle());
    this.sendBtn.addEventListener('click', () => this.handleSend());
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    // Auto-resize textarea
    this.inputEl.addEventListener('input', () => {
      if (!this.inputEl) return;
      this.inputEl.style.height = 'auto';
      this.inputEl.style.height = Math.min(this.inputEl.scrollHeight, 100) + 'px';
    });

    // Show welcome message
    this.addMessageToUI('AI_ASSISTANT', this.config.welcomeMessage);
  }

  private updatePanelConfig() {
    if (!this.panel) return;

    // Update title
    const titleEl = this.panel.querySelector('.tw-title');
    if (titleEl) titleEl.textContent = this.config.title;

    // Update placeholder
    if (this.inputEl) {
      this.inputEl.placeholder = this.config.placeholder;
    }

    // Re-render messages if we got history from server
    if (this.messageList && this.messages.length > 0) {
      this.messageList.innerHTML = '';
      for (const msg of this.messages) {
        this.addMessageToUI(msg.role, msg.content);
      }
    }
  }

  private async toggle() {
    // Retry init if not yet initialized
    if (!this.initialized) {
      await this.initSession();
    }

    this.isOpen = !this.isOpen;
    if (this.panel) {
      this.panel.classList.toggle('tw-hidden', !this.isOpen);
    }
    if (this.bubble) {
      this.bubble.classList.toggle('tw-bubble-active', this.isOpen);
    }
    if (this.isOpen) {
      this.scrollToBottom();
      setTimeout(() => this.inputEl?.focus(), 100);
    }
  }

  private async handleSend() {
    if (!this.inputEl || this.isSending) return;
    const text = this.inputEl.value.trim();
    if (!text) return;

    // Ensure session is initialized
    if (!this.initialized || !this.sessionId) {
      try {
        await this.initSession();
      } catch {
        this.addMessageToUI('AI_ASSISTANT', 'Không thể kết nối server. Vui lòng thử lại sau.');
        return;
      }
      if (!this.sessionId) {
        this.addMessageToUI('AI_ASSISTANT', 'Không thể kết nối server. Vui lòng thử lại sau.');
        return;
      }
    }

    this.inputEl.value = '';
    this.inputEl.style.height = 'auto';
    this.isSending = true;
    this.updateSendButton(true);

    // Add user message
    this.messages.push({ role: 'CUSTOMER', content: text });
    this.addMessageToUI('CUSTOMER', text);

    // Add typing indicator
    const typingEl = this.addTypingIndicator();

    try {
      let fullAnswer = '';
      const aiMsgEl = document.createElement('div');
      aiMsgEl.className = 'tw-msg tw-msg-ai';
      const contentEl = document.createElement('div');
      contentEl.className = 'tw-msg-content';
      aiMsgEl.appendChild(contentEl);

      // Replace typing with AI message element
      typingEl.replaceWith(aiMsgEl);

      for await (const chunk of this.api.sendMessageStream(this.sessionId, text)) {
        fullAnswer += chunk.content || '';
        contentEl.innerHTML = this.renderMarkdown(fullAnswer);
        this.scrollToBottom();
        if (chunk.isLast) break;
      }

      this.messages.push({ role: 'AI_ASSISTANT', content: fullAnswer });
    } catch (err) {
      typingEl.remove();
      this.addMessageToUI(
        'AI_ASSISTANT',
        'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại.',
      );
      console.error('[TinoWidget] Send error:', err);
    } finally {
      this.isSending = false;
      this.updateSendButton(false);
    }
  }

  private addMessageToUI(role: string, content: string) {
    if (!this.messageList) return;
    const el = document.createElement('div');
    el.className = role === 'CUSTOMER' ? 'tw-msg tw-msg-user' : 'tw-msg tw-msg-ai';
    const contentEl = document.createElement('div');
    contentEl.className = 'tw-msg-content';
    contentEl.innerHTML = this.renderMarkdown(content);
    el.appendChild(contentEl);
    this.messageList.appendChild(el);
    this.scrollToBottom();
  }

  private addTypingIndicator(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'tw-msg tw-msg-ai tw-typing';
    el.innerHTML = '<div class="tw-msg-content"><span class="tw-dot"></span><span class="tw-dot"></span><span class="tw-dot"></span></div>';
    this.messageList?.appendChild(el);
    this.scrollToBottom();
    return el;
  }

  private updateSendButton(disabled: boolean) {
    if (this.sendBtn) {
      this.sendBtn.disabled = disabled;
      this.sendBtn.style.opacity = disabled ? '0.5' : '1';
    }
  }

  private scrollToBottom() {
    if (this.messageList) {
      this.messageList.scrollTop = this.messageList.scrollHeight;
    }
  }

  private renderMarkdown(text: string): string {
    let html = this.escapeHtml(text);
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private loadSession(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private saveSession(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }

  private getStyles(color: string, isRight: boolean): string {
    return `
      :host { all: initial; }

      .tw-bubble {
        position: fixed;
        bottom: 20px;
        ${isRight ? 'right: 20px' : 'left: 20px'};
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 2147483647;
        transition: transform 0.2s;
      }
      .tw-bubble:hover { transform: scale(1.08); }
      .tw-bubble-active { transform: scale(0.9); }

      .tw-panel {
        position: fixed;
        bottom: 88px;
        ${isRight ? 'right: 20px' : 'left: 20px'};
        width: 380px;
        height: 520px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        color: #333;
        transition: opacity 0.2s, transform 0.2s;
      }
      .tw-hidden {
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
      }

      .tw-header {
        background: ${color};
        color: #fff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .tw-title {
        font-weight: 600;
        font-size: 15px;
      }
      .tw-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        opacity: 0.8;
      }
      .tw-close:hover { opacity: 1; }

      .tw-messages {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tw-msg {
        max-width: 85%;
        animation: tw-fade-in 0.2s ease;
      }
      @keyframes tw-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .tw-msg-user {
        align-self: flex-end;
      }
      .tw-msg-ai {
        align-self: flex-start;
      }
      .tw-msg-content {
        padding: 8px 12px;
        border-radius: 12px;
        line-height: 1.5;
        word-break: break-word;
      }
      .tw-msg-user .tw-msg-content {
        background: ${color};
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .tw-msg-ai .tw-msg-content {
        background: #f0f0f0;
        color: #333;
        border-bottom-left-radius: 4px;
      }
      .tw-msg-content code {
        background: rgba(0,0,0,0.08);
        padding: 1px 4px;
        border-radius: 3px;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        font-size: 13px;
      }
      .tw-msg-content pre {
        background: #1e1e1e;
        color: #d4d4d4;
        padding: 8px;
        border-radius: 6px;
        overflow-x: auto;
        margin: 4px 0;
      }
      .tw-msg-content pre code {
        background: none;
        padding: 0;
        color: inherit;
      }
      .tw-msg-content a {
        color: ${color};
        text-decoration: underline;
      }
      .tw-msg-content strong { font-weight: 600; }

      /* Typing indicator */
      .tw-typing .tw-msg-content {
        display: flex;
        gap: 4px;
        align-items: center;
        padding: 12px 16px;
      }
      .tw-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #999;
        animation: tw-bounce 1.2s infinite;
      }
      .tw-dot:nth-child(2) { animation-delay: 0.2s; }
      .tw-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes tw-bounce {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40% { transform: scale(1); opacity: 1; }
      }

      .tw-input-bar {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        padding: 10px 12px;
        border-top: 1px solid #e8e8e8;
        background: #fff;
        flex-shrink: 0;
      }
      .tw-input {
        flex: 1;
        border: 1px solid #d9d9d9;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        font-family: inherit;
        resize: none;
        outline: none;
        line-height: 1.4;
        max-height: 100px;
        overflow-y: auto;
      }
      .tw-input:focus { border-color: ${color}; }
      .tw-send {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.2s;
      }
      .tw-send:hover { opacity: 0.7; }

      /* Mobile responsive */
      @media (max-width: 480px) {
        .tw-panel {
          width: calc(100vw - 16px);
          height: calc(100vh - 100px);
          bottom: 84px;
          ${isRight ? 'right: 8px' : 'left: 8px'};
          border-radius: 12px;
        }
      }
    `;
  }
}
