import { ChatMessage } from '../../llm/interfaces/llm-adapter.interface';

export type EcommerceIntentType =
  | 'product_search'
  | 'product_detail'
  | 'product_compare'
  | 'cart_add'
  | 'cart_remove'
  | 'cart_update'
  | 'cart_view'
  | 'cart_clear'
  | 'order_create'
  | 'order_status'
  | 'order_history'
  | 'greeting'
  | 'knowledge_query'
  | 'unsupported';

export interface EcommerceIntent {
  name: EcommerceIntentType;
  confidence: number;
  extractedParams: Record<string, any>;
}

export interface IntentResult {
  intentName: EcommerceIntentType;
  response: string;
  toolResults: ToolResult[];
  confidence: number;
  unsupportedReason?: string;
}

export interface ToolResult {
  toolName: string;
  data: any;
  naturalLanguageInput: string;
}

export interface CustomerProfile {
  preferences: Record<string, string>;
  productInterests: string[];
  issueHistory: string[];
  budgetRange?: { min?: number; max?: number };
  lastVisit?: Date;
}

export interface RankedSearchResult {
  id: string;
  content: string;
  heading?: string;
  score: number;
  rerankedScore: number;
  source: 'product' | 'wiki';
  metadata: Record<string, any>;
}

export interface GraphState {
  // Input
  tenantId: string;
  tenantSlug: string;
  tenantDatabaseUrl: string;
  customerId: string;
  conversationId: string;
  userMessage: string;
  channel: string;

  // Memory (populated by MemoryManagerNode)
  recentMessages: ChatMessage[];
  conversationSummary: string;
  customerProfile: CustomerProfile;

  // Supervisor output
  detectedIntents: EcommerceIntent[];
  intentExecutionPlan: 'parallel' | 'sequential';

  // Per-intent results (populated by domain nodes)
  intentResults: IntentResult[];

  // Search artifacts
  expandedQueries: string[];
  searchResults: RankedSearchResult[];
  cragRetryCount: number;

  // Final output
  finalResponse: string;
  totalTokensUsed: number;
  latencyMs: number;

  // Error handling
  errors: Array<{ node: string; message: string; timestamp: Date }>;
}

export type NodeFunction = (state: GraphState) => Promise<Partial<GraphState>>;

export interface GraphEdge {
  from: string;
  to: string | ((state: GraphState) => string);
}

export interface GraphDefinition {
  nodes: Map<string, NodeFunction>;
  edges: GraphEdge[];
  entryPoint: string;
  endNode: string;
}
