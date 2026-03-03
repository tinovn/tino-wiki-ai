import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { MessengerController } from './messenger.controller';
import { MessengerService } from './messenger.service';
import { FacebookApiService } from './facebook-api.service';

@Module({
  imports: [AiModule],
  controllers: [MessengerController],
  providers: [MessengerService, FacebookApiService, HandoffService],
  exports: [FacebookApiService],
})
export class MessengerModule {}
