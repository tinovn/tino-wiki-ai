import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeedbackRepository } from '../repositories/feedback.repository';
import { CreateFeedbackDto } from '../dto/create-feedback.dto';
import { FeedbackReceivedEvent } from '@core/event-bus/events/feedback-received.event';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly feedbackRepo: FeedbackRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async submit(dto: CreateFeedbackDto, userId: string, tenantId: string) {
    const feedback = await this.feedbackRepo.create({
      queryLogId: dto.queryLogId,
      documentId: dto.documentId,
      userId,
      type: dto.type,
      comment: dto.comment,
    });

    this.eventEmitter.emit(
      'feedback.received',
      new FeedbackReceivedEvent(tenantId, feedback.id, dto.queryLogId, dto.type),
    );

    return feedback;
  }

  async findAll(page = 1, limit = 20) {
    return this.feedbackRepo.findAll(page, limit);
  }

  async getByDocumentId(documentId: string) {
    return this.feedbackRepo.findByDocumentId(documentId);
  }

  async getSummary() {
    return this.feedbackRepo.getSummary();
  }
}
