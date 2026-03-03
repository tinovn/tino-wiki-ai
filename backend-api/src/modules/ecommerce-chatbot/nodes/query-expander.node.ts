import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import { GraphState } from '../interfaces/graph-state.interface';
import { expandWithSynonyms } from '../dictionaries/synonym-dictionary';
import {
  QUERY_EXPANSION_SYSTEM_PROMPT,
  QUERY_EXPANSION_USER_PROMPT,
} from '../prompts/query-expansion.prompt';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

@Injectable()
export class QueryExpanderNode {
  private readonly logger = new Logger(QueryExpanderNode.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async execute(
    query: string,
    state: GraphState,
  ): Promise<string[]> {
    // Step 1: Synonym dictionary expansion
    const synonymExpanded = expandWithSynonyms(query);
    this.logger.debug(
      `Synonym expansion: "${query}" → ${synonymExpanded.length} variants`,
    );

    // If we got enough from synonyms, skip LLM
    if (synonymExpanded.length >= ECOMMERCE_CONSTANTS.MAX_EXPANDED_QUERIES) {
      return synonymExpanded.slice(0, ECOMMERCE_CONSTANTS.MAX_EXPANDED_QUERIES);
    }

    // Step 2: LLM expansion for complex queries
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();

      const response = await chatAdapter.chat(
        [
          { role: 'system', content: QUERY_EXPANSION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: QUERY_EXPANSION_USER_PROMPT.replace('{query}', query),
          },
        ],
        { responseFormat: 'json', temperature: 0.3 },
      );

      const llmExpanded = this.parseLlmExpansion(response.content);
      const allExpanded = new Set([...synonymExpanded, ...llmExpanded]);

      return Array.from(allExpanded).slice(
        0,
        ECOMMERCE_CONSTANTS.MAX_EXPANDED_QUERIES,
      );
    } catch (error) {
      this.logger.warn('LLM query expansion failed, using synonym-only', error);
      return synonymExpanded.slice(0, ECOMMERCE_CONSTANTS.MAX_EXPANDED_QUERIES);
    }
  }

  private parseLlmExpansion(content: string): string[] {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.filter((s): s is string => typeof s === 'string');
      }
      // Try extracting array from object
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]).filter(
          (s: unknown): s is string => typeof s === 'string',
        );
      }
    } catch {
      this.logger.debug('Failed to parse LLM expansion JSON');
    }
    return [];
  }
}
