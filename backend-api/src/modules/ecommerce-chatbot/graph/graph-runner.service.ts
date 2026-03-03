import { Injectable, Logger } from '@nestjs/common';
import { GraphState, EcommerceIntent, IntentResult } from '../interfaces/graph-state.interface';
import { SupervisorNode } from '../nodes/supervisor.node';
import { ProductAdvisorNode } from '../nodes/product-advisor.node';
import { CartManagerNode } from '../nodes/cart-manager.node';
import { OrderManagerNode } from '../nodes/order-manager.node';
import { MemoryManagerNode } from '../nodes/memory-manager.node';
import { BoundaryCheckerNode } from '../nodes/boundary-checker.node';
import { ResponseMergerNode } from '../nodes/response-merger.node';
import { KnowledgeSearchTool } from '../tools/knowledge-search.tool';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

/**
 * Lightweight graph runner — orchestrates the pipeline.
 * Code controls flow (routing, sequencing). LLM only handles language reasoning.
 */
@Injectable()
export class GraphRunnerService {
  private readonly logger = new Logger(GraphRunnerService.name);

  constructor(
    private readonly supervisor: SupervisorNode,
    private readonly productAdvisor: ProductAdvisorNode,
    private readonly cartManager: CartManagerNode,
    private readonly orderManager: OrderManagerNode,
    private readonly memoryManager: MemoryManagerNode,
    private readonly boundaryChecker: BoundaryCheckerNode,
    private readonly responseMerger: ResponseMergerNode,
    private readonly knowledgeSearch: KnowledgeSearchTool,
  ) {}

  async run(
    initialState: GraphState,
    conversationMessages: Array<{ role: string; content: string }>,
    existingSummary?: string,
    customerMemories?: Array<{ type: string; key: string; value: string }>,
  ): Promise<GraphState> {
    const startTime = Date.now();
    let state = { ...initialState };

    try {
      // === Node 1: Memory Manager (load) ===
      this.logger.debug('Node: MemoryManager (load)');
      const memoryState = await this.memoryManager.loadMemory(
        state,
        conversationMessages,
        existingSummary,
        customerMemories,
      );
      state = { ...state, ...memoryState };

      // === Node 2: Supervisor (intent classification) ===
      this.logger.debug('Node: Supervisor');
      const supervisorState = await this.supervisor.execute(state);
      state = { ...state, ...supervisorState };

      this.logger.log(
        `Detected ${state.detectedIntents.length} intent(s): ${state.detectedIntents.map((i) => i.name).join(', ')} [${state.intentExecutionPlan}]`,
      );

      // === Node 3: Domain nodes (execute intents) ===
      const intentResults = await this.executeIntents(state);
      state = { ...state, intentResults };

      // === Node 4: Response Merger ===
      this.logger.debug('Node: ResponseMerger');
      const finalResponse = await this.responseMerger.execute(intentResults);
      state = { ...state, finalResponse };

      // === Node 5: Memory Manager (save) ===
      this.logger.debug('Node: MemoryManager (save)');
      const allMessages = [
        ...conversationMessages,
        { role: 'user', content: state.userMessage },
        { role: 'assistant', content: finalResponse },
      ];
      await this.memoryManager.saveMemory(state, allMessages, existingSummary);
    } catch (error) {
      this.logger.error('Pipeline execution failed', error);
      state.errors = [
        ...(state.errors ?? []),
        {
          node: 'pipeline',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        },
      ];
      state.finalResponse =
        'Xin lỗi, mình gặp sự cố khi xử lý yêu cầu. Bạn có thể thử lại không?';
    }

    state.latencyMs = Date.now() - startTime;
    this.logger.log(
      `Pipeline completed in ${state.latencyMs}ms, response length: ${state.finalResponse?.length ?? 0}`,
    );

    return state;
  }

  private async executeIntents(
    state: GraphState,
  ): Promise<IntentResult[]> {
    const { detectedIntents, intentExecutionPlan } = state;

    if (detectedIntents.length === 0) {
      return [
        {
          intentName: 'knowledge_query',
          response:
            'Mình không hiểu rõ yêu cầu. Bạn có thể nói rõ hơn không?',
          toolResults: [],
          confidence: 0.3,
        },
      ];
    }

    if (intentExecutionPlan === 'parallel' && detectedIntents.length > 1) {
      this.logger.debug(
        `Executing ${detectedIntents.length} intents in parallel`,
      );
      const promises = detectedIntents.map((intent) =>
        this.executeIntentWithTimeout(intent, state),
      );
      return Promise.all(promises);
    }

    // Sequential execution
    this.logger.debug(
      `Executing ${detectedIntents.length} intents sequentially`,
    );
    const results: IntentResult[] = [];
    for (const intent of detectedIntents) {
      const result = await this.executeIntentWithTimeout(intent, state);
      results.push(result);
    }
    return results;
  }

  private async executeIntentWithTimeout(
    intent: EcommerceIntent,
    state: GraphState,
  ): Promise<IntentResult> {
    const timeoutMs = ECOMMERCE_CONSTANTS.NODE_TIMEOUT_MS;

    try {
      const resultPromise = this.routeIntent(intent, state);
      const timeoutPromise = new Promise<IntentResult>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Node timeout after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      );

      return await Promise.race([resultPromise, timeoutPromise]);
    } catch (error) {
      this.logger.error(
        `Intent ${intent.name} failed: ${error instanceof Error ? error.message : error}`,
      );
      return {
        intentName: intent.name,
        response: 'Xin lỗi, mình gặp lỗi khi xử lý yêu cầu này.',
        toolResults: [],
        confidence: 0.1,
      };
    }
  }

  private async routeIntent(
    intent: EcommerceIntent,
    state: GraphState,
  ): Promise<IntentResult> {
    this.logger.debug(`Routing intent: ${intent.name}`);

    switch (intent.name) {
      case 'product_search':
      case 'product_detail':
      case 'product_compare':
        return this.productAdvisor.execute(intent, state);

      case 'cart_add':
      case 'cart_remove':
      case 'cart_update':
      case 'cart_view':
      case 'cart_clear':
        return this.cartManager.execute(intent, state);

      case 'order_create':
      case 'order_status':
      case 'order_history':
        return this.orderManager.execute(intent, state);

      case 'greeting': {
        const { answer } = this.knowledgeSearch.search(state.userMessage);
        return {
          intentName: 'greeting',
          response: answer,
          toolResults: [],
          confidence: 1.0,
        };
      }

      case 'knowledge_query': {
        const query = (intent.extractedParams.query as string) ?? state.userMessage;
        const { found, answer } = this.knowledgeSearch.search(query);
        return {
          intentName: 'knowledge_query',
          response: answer,
          toolResults: [],
          confidence: found ? 0.8 : 0.4,
        };
      }

      case 'unsupported':
        return this.boundaryChecker.execute(intent, state.userMessage);

      default:
        return this.boundaryChecker.execute(intent, state.userMessage);
    }
  }
}
