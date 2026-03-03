import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import {
  redisPubProvider,
  redisSubProvider,
  REDIS_PUBSUB_PUB,
  REDIS_PUBSUB_SUB,
} from './redis-pubsub.provider';

@Global()
@Module({
  providers: [RedisService, redisPubProvider, redisSubProvider],
  exports: [RedisService, REDIS_PUBSUB_PUB, REDIS_PUBSUB_SUB],
})
export class RedisModule {}
