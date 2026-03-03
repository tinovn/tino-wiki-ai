export class QueryCompletedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly tenantDatabaseUrl: string,
    public readonly queryLogData: {
      question: string;
      answer?: string;
      customerId?: string;
      userId?: string;
      sourceDocIds: string[];
      searchLayers: string[];
      confidence?: number;
      latencyMs: number;
      tokenUsage?: { prompt: number; completion: number; total: number };
      wasSuccessful: boolean;
      failureReason?: string;
    },
  ) {}
}
