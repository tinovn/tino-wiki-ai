import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { CacheModule } from './cache/cache.module';
import { QueueModule } from './queue/queue.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { HealthModule } from './health/health.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    CacheModule,
    QueueModule,
    EventBusModule,
    HealthModule,
  ],
  exports: [
    DatabaseModule,
    RedisModule,
    CacheModule,
  ],
})
export class CoreModule {}
