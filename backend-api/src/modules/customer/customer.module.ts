import { Module } from '@nestjs/common';
import { CustomerController } from './controllers/customer.controller';
import { CustomerMemoryController } from './controllers/customer-memory.controller';
import { CustomerService } from './services/customer.service';
import { CustomerMemoryService } from './services/customer-memory.service';
import { ConversationHistoryService } from './services/conversation-history.service';
import { PreferenceExtractorService } from './services/preference-extractor.service';
import { CustomerRepository } from './repositories/customer.repository';
import { CustomerMemoryRepository } from './repositories/customer-memory.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { PreferenceExtractionProcessor } from './processors/preference-extraction.processor';

@Module({
  controllers: [CustomerController, CustomerMemoryController],
  providers: [
    CustomerService,
    CustomerMemoryService,
    ConversationHistoryService,
    PreferenceExtractorService,
    CustomerRepository,
    CustomerMemoryRepository,
    ConversationRepository,
    PreferenceExtractionProcessor,
  ],
  exports: [CustomerService, CustomerMemoryService],
})
export class CustomerModule {}
