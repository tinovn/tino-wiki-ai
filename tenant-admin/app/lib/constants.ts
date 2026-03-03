export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/',
  USERS: '/users',
  CONVERSATIONS: '/conversations',
  KNOWLEDGE_BASE: '/knowledge-base',
  DOCUMENTS: '/documents',
  DOCUMENTS_NEW: '/documents/new',
  CUSTOMERS: '/customers',
  AI_QUERY: '/ai-query',
  SCORING: '/scoring',
  FEEDBACK: '/feedback',
  LOGS: '/logs',
  MCP_CONNECTIONS: '/mcp-connections',
  CRAWLER: '/crawler',
  CRAWLER_NEW: '/crawler/new',
  SETTINGS: '/settings',
} as const;

export const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.REGISTER];

export const QUERY_KEYS = {
  USERS: 'users',
  DOCUMENTS: 'documents',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  CUSTOMERS: 'customers',
  CONVERSATIONS: 'conversations',
  MEMORIES: 'memories',
  ANALYTICS: 'analytics',
  CONTENT_GAPS: 'content-gaps',
  FEEDBACK: 'feedback',
  HEALTH: 'health',
  CRAWL_SOURCES: 'crawl-sources',
  CRAWL_JOBS: 'crawl-jobs',
} as const;
