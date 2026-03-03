import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { EcommerceChatbotModule } from '@modules/ecommerce-chatbot/ecommerce-chatbot.module';
import { HandoffService } from '@modules/conversations/services/handoff.service';
import { WidgetCorsMiddleware } from '@common/middleware/widget-cors.middleware';
import { ChatWidgetController } from './chatwidget.controller';
import { ChatWidgetService } from './chatwidget.service';

@Module({
  imports: [AiModule, EcommerceChatbotModule],
  controllers: [ChatWidgetController],
  providers: [ChatWidgetService, HandoffService],
})
export class ChatWidgetModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WidgetCorsMiddleware)
      .forRoutes({ path: 'widget/*', method: RequestMethod.ALL });
  }
}
