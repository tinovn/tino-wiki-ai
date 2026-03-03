import { Injectable } from '@nestjs/common';
import { QUERY_SYSTEM_PROMPT, QUERY_USER_PROMPT } from '@modules/llm/prompts/query-answer.prompts';
import { MergedSearchResult } from '../interfaces/search-result.interface';
import { ChatMessage } from '@modules/llm/interfaces/llm-adapter.interface';

@Injectable()
export class PromptBuilderService {
  build(
    question: string,
    results: MergedSearchResult[],
    customerMemory?: Array<{ type: string; key: string; value: string }>,
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

    return [
      { role: 'system' as const, content: QUERY_SYSTEM_PROMPT },
      { role: 'user' as const, content: userContent },
    ];
  }
}
