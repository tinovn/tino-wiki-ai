import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { TelegramApiService } from './telegram-api.service';

@Module({
  imports: [AiModule],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramApiService],
})
export class TelegramModule {}
