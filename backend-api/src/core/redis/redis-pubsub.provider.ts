import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_PUBSUB_PUB = 'REDIS_PUBSUB_PUB';
export const REDIS_PUBSUB_SUB = 'REDIS_PUBSUB_SUB';

function createRedisClient(configService: ConfigService): Redis {
  return new Redis({
    host: configService.get<string>('redis.host'),
    port: configService.get<number>('redis.port'),
    password: configService.get<string>('redis.password') || undefined,
    db: configService.get<number>('redis.db'),
    maxRetriesPerRequest: null, // Required for @socket.io/redis-adapter with ioredis v5
  });
}

export const redisPubProvider: Provider = {
  provide: REDIS_PUBSUB_PUB,
  useFactory: (configService: ConfigService) => createRedisClient(configService),
  inject: [ConfigService],
};

export const redisSubProvider: Provider = {
  provide: REDIS_PUBSUB_SUB,
  useFactory: (configService: ConfigService) => createRedisClient(configService),
  inject: [ConfigService],
};
