export class CustomerMessageEvent {
  constructor(
    public readonly tenantId: string,
    public readonly tenantDatabaseUrl: string,
    public readonly customerId: string,
    public readonly conversationId: string,
    public readonly messages: Array<{ role: string; content: string }>,
  ) {}
}
