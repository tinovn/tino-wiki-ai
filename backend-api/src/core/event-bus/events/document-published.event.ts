export class DocumentPublishedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly tenantDatabaseUrl: string,
    public readonly documentId: string,
    public readonly version: number,
  ) {}
}
