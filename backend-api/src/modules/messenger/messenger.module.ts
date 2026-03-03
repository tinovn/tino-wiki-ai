import { Module } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { MessengerController } from './messenger.controller';
import { MessengerService } from './messenger.service';
import { FacebookApiService } from './facebook-api.service';

@Module({
  imports: [AiModule],
  controllers: [MessengerController],
  providers: [MessengerService, FacebookApiService],
})
export class MessengerModule {}
