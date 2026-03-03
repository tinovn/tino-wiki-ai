import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LlmProviderFactory } from '@modules/llm/llm-provider.factory';
import { VectorStoreService } from '@modules/vector-store/vector-store.service';
import { CacheService } from '@core/cache/cache.service';
import { CACHE_PREFIX, CACHE_TTL } from '@common/constants';
import { ContextMergerService } from './context-merger.service';
import { PromptBuilderService } from './prompt-builder.service';
import { QueryResult } from '../interfaces/search-result.interface';
import { QueryCompletedEvent } from '@core/event-bus/events/query-completed.event';
import { ChatStreamChunk } from '@modules/llm/interfaces/llm-adapter.interface';

@Injectable()
export class QueryEngineService {
  private readonly logger = new Logger(QueryEngineService.name);

  constructor(
    private readonly llmFactory: LlmProviderFactory,
    private readonly vectorStore: VectorStoreService,
    private readonly contextMerger: ContextMergerService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async query(params: {
    tenantId: string;
    tenantSlug: string;
    tenantDatabaseUrl: string;
    question: string;
    customerId?: string;
    customerMemory?: Array<{ type: string; key: string; value: string }>;
    conversationHistory?: Array<{ role: string; content: string }>;
    provider?: string;
    allowGeneralKnowledge?: boolean;
    categoryId?: string;
    documentType?: string;
    audience?: string;
    tags?: string[];
  }): Promise<QueryResult> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = `${params.question}:${params.customerId || 'anon'}`;
    const cached = await this.cacheService.get<QueryResult>(
      params.tenantId,
      CACHE_PREFIX.QUERY,
      cacheKey,
    );
    if (cached) {
      this.logger.debug('Query cache hit');
      return cached;
    }

    // Step 1-3: Try RAG (embed + search + merge). Fallback to direct chat if fails
    let mergedResults: any[] = [];
    try {
      const embeddingAdapter = this.llmFactory.getEmbeddingAdapter();
      const embedResult = await embeddingAdapter.embed([params.question]);
      const questionVector = embedResult.embeddings[0];

      // Build dynamic filter for tenant search
      const tenantFilter: Record<string, any> = { layer: 'tenant' };
      if (params.categoryId) tenantFilter.categoryId = params.categoryId;
      if (params.documentType) tenantFilter.documentType = params.documentType;
      if (params.audience) tenantFilter.audience = params.audience;

      const [customerResults, tenantResults, masterResults] = await Promise.all([
        params.customerId
          ? this.vectorStore.search(params.tenantSlug, {
              vector: questionVector,
              limit: 5,
              filter: { layer: 'customer', customerId: params.customerId },
            })
          : Promise.resolve([]),
        this.vectorStore.search(params.tenantSlug, {
          vector: questionVector,
          limit: 8,
          filter: tenantFilter,
        }).catch(() => []),
        this.vectorStore.search('master', {
          vector: questionVector,
          limit: 5,
          filter: { layer: 'master' },
        }).catch(() => []),
      ]);

      mergedResults = this.contextMerger.merge(customerResults, tenantResults, masterResults);
    } catch (err: any) {
      this.logger.warn(`RAG search failed, falling back to direct chat: ${err.message}`);
    }

    // Step 4: Build prompt
    const messages = this.promptBuilder.build(
      params.question,
      mergedResults,
      params.customerMemory,
      {
        allowGeneralKnowledge: params.allowGeneralKnowledge,
        conversationHistory: params.conversationHistory,
      },
    );

    // Step 5: Call LLM
    const chatAdapter = this.llmFactory.getChatAdapter(params.provider);
    const response = await chatAdapter.chat(messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    const latencyMs = Date.now() - startTime;

    // Build result
    const result: QueryResult = {
      answer: response.content,
      sources: mergedResults.map((r) => ({
        documentId: r.documentId,
        heading: r.heading,
        layer: r.layer,
        score: r.score,
      })),
      confidence: mergedResults.length > 0 ? mergedResults[0].score : 0,
      usage: response.usage,
      latencyMs,
    };

    // Cache the result
    await this.cacheService.set(
      params.tenantId,
      CACHE_PREFIX.QUERY,
      cacheKey,
      result,
      CACHE_TTL.LLM_RESPONSE,
    );

    // Emit query completed event for analytics
    this.eventEmitter.emit(
      'query.completed',
      new QueryCompletedEvent(params.tenantId, params.tenantDatabaseUrl, {
        question: params.question,
        answer: result.answer,
        customerId: params.customerId,
        sourceDocIds: result.sources.map((s) => s.documentId),
        searchLayers: [...new Set(result.sources.map((s) => s.layer))],
        confidence: result.confidence,
        latencyMs,
        tokenUsage: {
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
          total: result.usage.totalTokens,
        },
        wasSuccessful: true,
      }),
    );

    this.logger.log(`Query completed in ${latencyMs}ms, confidence: ${result.confidence.toFixed(2)}`);
    return result;
  }

  async *queryStream(params: {
    tenantId: string;
    tenantSlug: string;
    tenantDatabaseUrl: string;
    question: string;
    customerId?: string;
    customerMemory?: Array<{ type: string; key: string; value: string }>;
    conversationHistory?: Array<{ role: string; content: string }>;
    provider?: string;
    allowGeneralKnowledge?: boolean;
    categoryId?: string;
    documentType?: string;
    audience?: string;
    tags?: string[];
  }): AsyncIterable<ChatStreamChunk> {
    let mergedResults: any[] = [];

    // Try RAG: embed + search. If embedding fails, fallback to direct chat
    try {
      const embeddingAdapter = this.llmFactory.getEmbeddingAdapter();
      const embedResult = await embeddingAdapter.embed([params.question]);
      const questionVector = embedResult.embeddings[0];

      // Build dynamic filter for tenant search
      const tenantFilter: Record<string, any> = { layer: 'tenant' };
      if (params.categoryId) tenantFilter.categoryId = params.categoryId;
      if (params.documentType) tenantFilter.documentType = params.documentType;
      if (params.audience) tenantFilter.audience = params.audience;

      const [customerResults, tenantResults, masterResults] = await Promise.all([
        params.customerId
          ? this.vectorStore.search(params.tenantSlug, {
              vector: questionVector,
              limit: 5,
              filter: { layer: 'customer', customerId: params.customerId },
            })
          : Promise.resolve([]),
        this.vectorStore.search(params.tenantSlug, {
          vector: questionVector,
          limit: 8,
          filter: tenantFilter,
        }).catch(() => []),
        this.vectorStore.search('master', {
          vector: questionVector,
          limit: 5,
          filter: { layer: 'master' },
        }).catch(() => []),
      ]);

      mergedResults = this.contextMerger.merge(customerResults, tenantResults, masterResults);
    } catch (err: any) {
      this.logger.warn(`RAG search failed, falling back to direct chat: ${err.message}`);
    }

    // Build prompt (works with empty context too)
    const messages = this.promptBuilder.build(
      params.question,
      mergedResults,
      params.customerMemory,
      {
        allowGeneralKnowledge: params.allowGeneralKnowledge,
        conversationHistory: params.conversationHistory,
      },
    );

    // Stream LLM response and collect full answer for analytics
    const startTime = Date.now();
    const chatAdapter = this.llmFactory.getChatAdapter(params.provider);
    let fullAnswer = '';
    let lastUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for await (const chunk of chatAdapter.chatStream(messages, { temperature: 0.3, maxTokens: 2000 })) {
      fullAnswer += chunk.content;
      if (chunk.usage) lastUsage = chunk.usage;
      yield chunk;
    }

    // Log analytics after stream completes
    const latencyMs = Date.now() - startTime;
    this.eventEmitter.emit(
      'query.completed',
      new QueryCompletedEvent(params.tenantId, params.tenantDatabaseUrl, {
        question: params.question,
        answer: fullAnswer,
        customerId: params.customerId,
        sourceDocIds: mergedResults.map((r) => r.documentId),
        searchLayers: [...new Set(mergedResults.map((r) => r.layer))],
        confidence: mergedResults.length > 0 ? mergedResults[0].score : 0,
        latencyMs,
        tokenUsage: {
          prompt: lastUsage.promptTokens,
          completion: lastUsage.completionTokens,
          total: lastUsage.totalTokens,
        },
        wasSuccessful: true,
      }),
    );

    this.logger.log(`Stream query completed in ${latencyMs}ms, confidence: ${mergedResults.length > 0 ? mergedResults[0].score.toFixed(2) : '0.00'}`);
  }
}
