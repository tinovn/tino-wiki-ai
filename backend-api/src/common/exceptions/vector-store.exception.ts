import { InternalServerErrorException } from '@nestjs/common';

export class VectorStoreException extends InternalServerErrorException {
  constructor(operation: string, detail?: string) {
    super(`Vector store error during "${operation}"${detail ? `: ${detail}` : ''}`);
  }
}
