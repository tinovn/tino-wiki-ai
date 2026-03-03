export class DocumentUpdatedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly documentId: string,
    public readonly version: number,
  ) {}
}
