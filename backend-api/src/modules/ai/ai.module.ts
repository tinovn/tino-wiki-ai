import { Module, forwardRef } from '@nestjs/common';
import { AiQueryController } from './controllers/ai-query.controller';
import { AiStatusController } from './controllers/ai-status.controller';
import { AiOrchestratorService } from './services/ai-orchestrator.service';
import { ContentCleanerService } from './services/content-cleaner.service';
import { SummarizerService } from './services/summarizer.service';
import { IntentDetectorService } from './services/intent-detector.service';
import { ChunkerService } from './services/chunker.service';
import { QueryEngineService } from './services/query-engine.service';
import { ContextMergerService } from './services/context-merger.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { AiPipelineProcessor } from './processors/ai-pipeline.processor';
import { DocumentEventListener } from './listeners/document-event.listener';
import { TelegramModule } from '@modules/telegram/telegram.module';

@Module({
  imports: [forwardRef(() => TelegramModule)],
  controllers: [AiQueryController, AiStatusController],
  providers: [
    AiOrchestratorService,
    ContentCleanerService,
    SummarizerService,
    IntentDetectorService,
    ChunkerService,
    QueryEngineService,
    ContextMergerService,
    PromptBuilderService,
    AiPipelineProcessor,
    DocumentEventListener,
  ],
  exports: [QueryEngineService, AiOrchestratorService],
})
export class AiModule {}
