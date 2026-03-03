import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { MessengerModule } from '@modules/messenger/messenger.module';
import { TelegramModule } from '@modules/telegram/telegram.module';
import { ConversationsController } from './controllers/conversations.controller';
import { CannedResponsesController } from './controllers/canned-responses.controller';
import { ConversationsService } from './services/conversations.service';
import { ChannelDispatcherService } from './services/channel-dispatcher.service';
import { HandoffService } from './services/handoff.service';
import { ConversationsRepository } from './repositories/conversations.repository';
import { CannedResponsesRepository } from './repositories/canned-responses.repository';
import { ConversationsGateway } from './gateways/conversations.gateway';

@Module({
  imports: [AiModule, MessengerModule, TelegramModule],
  controllers: [ConversationsController, CannedResponsesController],
  providers: [
    ConversationsService,
    ChannelDispatcherService,
    HandoffService,
    ConversationsRepository,
    CannedResponsesRepository,
    ConversationsGateway,
  ],
  exports: [ConversationsService, HandoffService, ConversationsGateway],
})
export class ConversationsModule {}
