import { Module, forwardRef } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { EcommerceChatbotModule } from '@modules/ecommerce-chatbot/ecommerce-chatbot.module';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramApiService } from './telegram-api.service';

@Module({
  imports: [forwardRef(() => AiModule), EcommerceChatbotModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramApiService, HandoffService],
  exports: [TelegramService, TelegramApiService],
})
export class TelegramModule {}
