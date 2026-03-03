import { Injectable } from '@nestjs/common';
import { QUERY_SYSTEM_PROMPT_STRICT, QUERY_SYSTEM_PROMPT_GENERAL, QUERY_USER_PROMPT } from '@modules/llm/prompts/query-answer.prompts';
import { MergedSearchResult } from '../interfaces/search-result.interface';
import { ChatMessage } from '@modules/llm/interfaces/llm-adapter.interface';

@Injectable()
export class PromptBuilderService {
  build(
    question: string,
    results: MergedSearchResult[],
    customerMemory?: Array<{ type: string; key: string; value: string }>,
    options?: {
      allowGeneralKnowledge?: boolean;
      conversationHistory?: Array<{ role: string; content: string }>;
    },
  ): ChatMessage[] {
    // Build context from search results
    const context = results
      .map((r, idx) => {
        const heading = r.heading ? ` (${r.heading})` : '';
        const layer = `[${r.layer.toUpperCase()}]`;
        return `[${idx + 1}] ${layer}${heading}\n${r.chunkContent}`;
      })
      .join('\n\n---\n\n');

    // Build customer memory string
    const memoryStr = customerMemory?.length
      ? customerMemory
          .map((m) => `- ${m.key}: ${m.value} (${m.type})`)
          .join('\n')
      : 'No customer preferences available';

    // Build user prompt
    const userContent = QUERY_USER_PROMPT
      .replace('{context}', context || 'No relevant context found.')
      .replace('{customerMemory}', memoryStr)
      .replace('{question}', question);

    // Chọn system prompt dựa trên setting
    const systemPrompt = options?.allowGeneralKnowledge
      ? QUERY_SYSTEM_PROMPT_GENERAL
      : QUERY_SYSTEM_PROMPT_STRICT;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history as multi-turn context (last 10 messages)
    if (options?.conversationHistory?.length) {
      const recent = options.conversationHistory.slice(-10);
      for (const msg of recent) {
        const role = msg.role === 'CUSTOMER' ? 'user' : 'assistant';
        messages.push({ role: role as ChatMessage['role'], content: msg.content });
      }
    }

    messages.push({ role: 'user', content: userContent });

    return messages;
  }
}
