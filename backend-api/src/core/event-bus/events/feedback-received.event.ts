export class FeedbackReceivedEvent {
  constructor(
    public readonly tenantId: string,
    public readonly feedbackId: string,
    public readonly queryLogId: string,
    public readonly type: string,
  ) {}
}
