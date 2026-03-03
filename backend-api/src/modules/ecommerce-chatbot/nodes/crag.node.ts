import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import { RankedSearchResult } from '../interfaces/graph-state.interface';
import {
  CRAG_CHECK_SYSTEM_PROMPT,
  CRAG_CHECK_USER_PROMPT,
  CRAG_REWRITE_PROMPT,
} from '../prompts/crag-check.prompt';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

interface CragCheckResult {
  score: number;
  reasoning: string;
  suggestedQuery?: string;
}

/**
 * Corrective RAG (CRAG): Self-check search quality, retry with simplified query if poor.
 * Cost: 1 extra LLM call on failure, but reduces ~30% refusal rate.
 */
@Injectable()
export class CragNode {
  private readonly logger = new Logger(CragNode.name);

  constructor(private readonly llmFactory: LlmProviderFactory) {}

  async check(
    query: string,
    results: RankedSearchResult[],
  ): Promise<{
    needsRetry: boolean;
    rewrittenQuery?: string;
    score: number;
  }> {
    if (results.length === 0) {
      return { needsRetry: true, rewrittenQuery: await this.rewriteQuery(query), score: 0 };
    }

    // Quick heuristic: if top result has high score, skip LLM check
    const topScore = results[0]?.rerankedScore ?? 0;
    if (topScore > 5.0) {
      return { needsRetry: false, score: 5 };
    }

    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const searchResultsText = results
        .slice(0, 5)
        .map((r) => `- ${r.heading}: ${r.content.substring(0, 200)}`)
        .join('\n');

      const response = await chatAdapter.chat(
        [
          { role: 'system', content: CRAG_CHECK_SYSTEM_PROMPT },
          {
            role: 'user',
            content: CRAG_CHECK_USER_PROMPT
              .replace('{query}', query)
              .replace('{searchResults}', searchResultsText),
          },
        ],
        { responseFormat: 'json', temperature: 0.1 },
      );

      const checkResult = this.parseCheckResult(response.content);

      this.logger.debug(
        `CRAG check: query="${query}", score=${checkResult.score}, needsRetry=${checkResult.score < ECOMMERCE_CONSTANTS.CRAG_QUALITY_THRESHOLD}`,
      );

      if (checkResult.score < ECOMMERCE_CONSTANTS.CRAG_QUALITY_THRESHOLD) {
        const rewrittenQuery =
          checkResult.suggestedQuery || (await this.rewriteQuery(query));
        return {
          needsRetry: true,
          rewrittenQuery,
          score: checkResult.score,
        };
      }

      return { needsRetry: false, score: checkResult.score };
    } catch (error) {
      this.logger.warn('CRAG check failed, proceeding without retry', error);
      return { needsRetry: false, score: 3 };
    }
  }

  private async rewriteQuery(query: string): Promise<string> {
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const response = await chatAdapter.chat([
        {
          role: 'user',
          content: CRAG_REWRITE_PROMPT.replace('{query}', query),
        },
      ]);
      return response.content.trim().replace(/"/g, '');
    } catch {
      // Fallback: extract key nouns
      const words = query.split(/\s+/).filter((w) => w.length > 2);
      return words.slice(0, 3).join(' ');
    }
  }

  private parseCheckResult(content: string): CragCheckResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          score: typeof parsed.score === 'number' ? parsed.score : 3,
          reasoning: parsed.reasoning ?? '',
          suggestedQuery: parsed.suggestedQuery,
        };
      }
    } catch {
      this.logger.debug('Failed to parse CRAG check JSON');
    }
    return { score: 3, reasoning: 'Parse failed' };
  }
}
