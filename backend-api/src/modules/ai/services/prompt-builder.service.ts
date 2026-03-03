import { Injectable } from '@nestjs/common';
import { QUERY_SYSTEM_PROMPT_STRICT, QUERY_SYSTEM_PROMPT_GENERAL, QUERY_USER_PROMPT } from '@modules/llm/prompts/query-answer.prompts';
import { MergedSearchResult } from '../interfaces/search-result.interface';
import { ChatMessage } from '@modules/llm/interfaces/llm-adapter.interface';

// Rough token estimation: ~4 chars per token for mixed Vietnamese/English
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Reserve tokens for LLM response (max_tokens in query-engine)
const MAX_PROMPT_TOKENS = 12000;
const RESPONSE_RESERVE = 2000;
const TOKEN_BUDGET = MAX_PROMPT_TOKENS - RESPONSE_RESERVE; // 10000 tokens for prompt

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
    // Chọn system prompt dựa trên setting
    const systemPrompt = options?.allowGeneralKnowledge
      ? QUERY_SYSTEM_PROMPT_GENERAL
      : QUERY_SYSTEM_PROMPT_STRICT;

    // Build customer memory string
    const memoryStr = customerMemory?.length
      ? customerMemory
          .map((m) => `- ${m.key}: ${m.value} (${m.type})`)
          .join('\n')
      : 'No customer preferences available';

    // Calculate fixed token costs (system prompt + question + template overhead)
    const questionContent = QUERY_USER_PROMPT
      .replace('{context}', '')
      .replace('{customerMemory}', memoryStr)
      .replace('{question}', question);
    const fixedTokens = estimateTokens(systemPrompt) + estimateTokens(questionContent);

    // Remaining budget for context + conversation history
    let remainingBudget = TOKEN_BUDGET - fixedTokens;

    // Allocate: 70% for RAG context, 30% for conversation history
    const contextBudget = Math.floor(remainingBudget * 0.7);
    const historyBudget = Math.floor(remainingBudget * 0.3);

    // Build context from search results, truncating if needed
    let contextTokens = 0;
    const contextParts: string[] = [];
    for (const [idx, r] of results.entries()) {
      const heading = r.heading ? ` (${r.heading})` : '';
      const layer = `[${r.layer.toUpperCase()}]`;
      const part = `[${idx + 1}] ${layer}${heading}\n${r.chunkContent}`;
      const partTokens = estimateTokens(part);
      if (contextTokens + partTokens > contextBudget) break;
      contextParts.push(part);
      contextTokens += partTokens;
    }
    const context = contextParts.join('\n\n---\n\n');

    // Build user prompt
    const userContent = QUERY_USER_PROMPT
      .replace('{context}', context || 'No relevant context found.')
      .replace('{customerMemory}', memoryStr)
      .replace('{question}', question);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history, truncating from the oldest if over budget
    if (options?.conversationHistory?.length) {
      const recent = options.conversationHistory.slice(-10);
      let historyTokens = 0;
      const historyMessages: ChatMessage[] = [];

      // Iterate from newest to oldest, then reverse
      for (let i = recent.length - 1; i >= 0; i--) {
        const msg = recent[i];
        const msgTokens = estimateTokens(msg.content);
        if (historyTokens + msgTokens > historyBudget) break;
        const role = msg.role === 'CUSTOMER' ? 'user' : 'assistant';
        historyMessages.unshift({ role: role as ChatMessage['role'], content: msg.content });
        historyTokens += msgTokens;
      }

      messages.push(...historyMessages);
    }

    messages.push({ role: 'user', content: userContent });

    return messages;
  }
}
