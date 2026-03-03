import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AiModule } from '@modules/ai/ai.module';
import { WidgetCorsMiddleware } from '@common/middleware/widget-cors.middleware';
import { ChatWidgetController } from './chatwidget.controller';
import { ChatWidgetService } from './chatwidget.service';

@Module({
  imports: [AiModule],
  controllers: [ChatWidgetController],
  providers: [ChatWidgetService],
})
export class ChatWidgetModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WidgetCorsMiddleware)
      .forRoutes({ path: 'widget/*', method: RequestMethod.ALL });
  }
}
