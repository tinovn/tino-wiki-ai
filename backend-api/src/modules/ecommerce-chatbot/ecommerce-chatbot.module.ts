import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';

// Main service
import { EcommerceChatbotService } from './ecommerce-chatbot.service';

// Graph
import { GraphRunnerService } from './graph/graph-runner.service';

// Nodes
import { SupervisorNode } from './nodes/supervisor.node';
import { ProductAdvisorNode } from './nodes/product-advisor.node';
import { CartManagerNode } from './nodes/cart-manager.node';
import { OrderManagerNode } from './nodes/order-manager.node';
import { MemoryManagerNode } from './nodes/memory-manager.node';
import { BoundaryCheckerNode } from './nodes/boundary-checker.node';
import { ResponseMergerNode } from './nodes/response-merger.node';
import { QueryExpanderNode } from './nodes/query-expander.node';
import { RerankerNode } from './nodes/reranker.node';
import { CragNode } from './nodes/crag.node';

// Tools
import { ProductSearchTool } from './tools/product-search.tool';
import { ProductLookupTool } from './tools/product-lookup.tool';
import { CartOperationsTool } from './tools/cart-operations.tool';
import { OrderLookupTool } from './tools/order-lookup.tool';
import { DeterministicSortTool } from './tools/deterministic-sort.tool';
import { KnowledgeSearchTool } from './tools/knowledge-search.tool';

// Mock services
import { MockProductCatalogService } from './mock/mock-product-catalog.service';
import { MockCartService } from './mock/mock-cart.service';
import { MockOrderService } from './mock/mock-order.service';

// Memory
import { ConversationMemoryService } from './memory/conversation-memory.service';
import { SessionProfileService } from './memory/session-profile.service';

const providers = [
  // Main service
  EcommerceChatbotService,

  // Graph
  GraphRunnerService,

  // Nodes
  SupervisorNode,
  ProductAdvisorNode,
  CartManagerNode,
  OrderManagerNode,
  MemoryManagerNode,
  BoundaryCheckerNode,
  ResponseMergerNode,
  QueryExpanderNode,
  RerankerNode,
  CragNode,

  // Tools
  ProductSearchTool,
  ProductLookupTool,
  CartOperationsTool,
  OrderLookupTool,
  DeterministicSortTool,
  KnowledgeSearchTool,

  // Mock services
  MockProductCatalogService,
  MockCartService,
  MockOrderService,

  // Memory
  ConversationMemoryService,
  SessionProfileService,
];

@Module({
  imports: [LlmModule],
  providers,
  exports: [EcommerceChatbotService, MockCartService, MockOrderService],
})
export class EcommerceChatbotModule {}
