import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '@common/constants';
import { PreferenceExtractorService } from '../services/preference-extractor.service';

@Processor(QUEUES.PREFERENCE_EXTRACTION)
export class PreferenceExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(PreferenceExtractionProcessor.name);

  constructor(private readonly extractor: PreferenceExtractorService) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { customerId, messages } = job.data;
    this.logger.log(`Extracting preferences for customer ${customerId}`);
    await this.extractor.extractFromMessages(customerId, messages);
  }
}
