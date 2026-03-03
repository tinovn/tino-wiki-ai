import { InternalServerErrorException } from '@nestjs/common';

export class AiProcessingException extends InternalServerErrorException {
  constructor(step: string, documentId: string, detail?: string) {
    super(`AI processing failed at step "${step}" for document "${documentId}"${detail ? `: ${detail}` : ''}`);
  }
}
