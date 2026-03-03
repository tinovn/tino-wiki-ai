import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import {
  GraphState,
  EcommerceIntent,
  IntentResult,
  RankedSearchResult,
} from '../interfaces/graph-state.interface';
import { QueryExpanderNode } from './query-expander.node';
import { RerankerNode } from './reranker.node';
import { CragNode } from './crag.node';
import { ProductSearchTool } from '../tools/product-search.tool';
import { DeterministicSortTool } from '../tools/deterministic-sort.tool';
import {
  PRODUCT_ADVISOR_SYSTEM_PROMPT,
  PRODUCT_ADVISOR_USER_PROMPT,
} from '../prompts/product-advisor.prompt';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

@Injectable()
export class ProductAdvisorNode {
  private readonly logger = new Logger(ProductAdvisorNode.name);

  constructor(
    private readonly llmFactory: LlmProviderFactory,
    private readonly queryExpander: QueryExpanderNode,
    private readonly reranker: RerankerNode,
    private readonly crag: CragNode,
    private readonly productSearch: ProductSearchTool,
    private readonly deterministicSort: DeterministicSortTool,
  ) {}

  async execute(
    intent: EcommerceIntent,
    state: GraphState,
  ): Promise<IntentResult> {
    const query =
      (intent.extractedParams.productName as string) ??
      (intent.extractedParams.query as string) ??
      state.userMessage;

    this.logger.debug(`ProductAdvisor: query="${query}"`);

    // Step 1: Check for deterministic sort keywords
    const sortResult = this.deterministicSort.detect(query);
    if (sortResult.detected && sortResult.products.length > 0) {
      this.logger.debug(
        `Deterministic sort: ${sortResult.sortType}, ${sortResult.products.length} results`,
      );
      return this.generateResponse(
        intent.name,
        query,
        sortResult.products.map((p) => ({
          id: p.id,
          content: `${p.name} - ${p.price.toLocaleString('vi-VN')} đ. ${p.shortDescription}`,
          heading: p.name,
          score: 1,
          rerankedScore: 1,
          source: 'product' as const,
          metadata: { productId: p.id, price: p.price, category: p.category, brand: p.brand },
        })),
        state,
      );
    }

    // Step 2: Query expansion
    const expandedQueries = await this.queryExpander.execute(query, state);

    // Step 3: Search
    let searchResults = await this.productSearch.search(expandedQueries);

    // Step 4: Rerank
    searchResults = this.reranker.rerank(query, searchResults);

    // Step 5: CRAG - quality check and retry if needed
    if (
      searchResults.length > 0 &&
      state.cragRetryCount < ECOMMERCE_CONSTANTS.CRAG_MAX_RETRIES
    ) {
      const cragResult = await this.crag.check(query, searchResults);

      if (cragResult.needsRetry && cragResult.rewrittenQuery) {
        this.logger.debug(
          `CRAG retry: "${query}" → "${cragResult.rewrittenQuery}"`,
        );
        const retryResults = await this.productSearch.search([
          cragResult.rewrittenQuery,
        ]);
        const retryReranked = this.reranker.rerank(
          cragResult.rewrittenQuery,
          retryResults,
        );

        // Merge: keep unique results, prefer higher scores
        const merged = this.mergeResults(searchResults, retryReranked);
        searchResults = merged;
      }
    }

    // Step 6: Generate natural language response with LLM
    return this.generateResponse(intent.name, query, searchResults, state);
  }

  private async generateResponse(
    intentName: string,
    query: string,
    results: RankedSearchResult[],
    state: GraphState,
  ): Promise<IntentResult> {
    const topResults = results.slice(
      0,
      ECOMMERCE_CONSTANTS.MAX_PRODUCTS_IN_RESPONSE,
    );

    if (topResults.length === 0) {
      return {
        intentName: intentName as any,
        response: `Mình không tìm thấy sản phẩm nào phù hợp với "${query}". Bạn có thể mô tả rõ hơn hoặc thử tìm kiếm khác không?`,
        toolResults: [],
        confidence: 0.3,
      };
    }

    try {
      const chatAdapter = this.llmFactory.getChatAdapter();

      const systemPrompt = PRODUCT_ADVISOR_SYSTEM_PROMPT
        .replace('{customerProfile}', this.formatProfile(state))
        .replace('{conversationSummary}', state.conversationSummary || 'Chưa có');

      const searchResultsText = topResults
        .map((r, i) => `${i + 1}. ${r.content}`)
        .join('\n\n');

      const userPrompt = PRODUCT_ADVISOR_USER_PROMPT
        .replace('{userQuery}', query)
        .replace('{searchResults}', searchResultsText);

      const response = await chatAdapter.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      return {
        intentName: intentName as any,
        response: response.content,
        toolResults: topResults.map((r) => ({
          toolName: 'product_search',
          data: r.metadata,
          naturalLanguageInput: query,
        })),
        confidence: topResults[0]?.rerankedScore > 3 ? 0.9 : 0.7,
      };
    } catch (error) {
      this.logger.error('ProductAdvisor LLM response generation failed', error);
      // Fallback: structured text response without LLM
      const fallback = topResults
        .map(
          (r, i) =>
            `${i + 1}. **${r.heading}** - ${r.metadata?.price?.toLocaleString('vi-VN') ?? '?'} đ`,
        )
        .join('\n');

      return {
        intentName: intentName as any,
        response: `Đây là kết quả tìm kiếm cho "${query}":\n\n${fallback}`,
        toolResults: [],
        confidence: 0.6,
      };
    }
  }

  private mergeResults(
    original: RankedSearchResult[],
    retry: RankedSearchResult[],
  ): RankedSearchResult[] {
    const merged = new Map<string, RankedSearchResult>();

    for (const r of original) {
      merged.set(r.id, r);
    }
    for (const r of retry) {
      if (!merged.has(r.id) || merged.get(r.id)!.rerankedScore < r.rerankedScore) {
        merged.set(r.id, r);
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) => b.rerankedScore - a.rerankedScore,
    );
  }

  private formatProfile(state: GraphState): string {
    const p = state.customerProfile;
    if (!p) return 'Khách mới';
    const parts: string[] = [];
    if (p.productInterests.length > 0)
      parts.push(`Quan tâm: ${p.productInterests.join(', ')}`);
    if (Object.keys(p.preferences).length > 0)
      parts.push(
        `Sở thích: ${Object.entries(p.preferences)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`,
      );
    return parts.length > 0 ? parts.join('. ') : 'Khách mới';
  }
}
