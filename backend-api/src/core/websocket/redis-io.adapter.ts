import { INestApplication, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { REDIS_PUBSUB_PUB, REDIS_PUBSUB_SUB } from '../redis/redis-pubsub.provider';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  async connectToRedis(app: INestApplication): Promise<void> {
    const pubClient = app.get<Redis>(REDIS_PUBSUB_PUB);
    const subClient = app.get<Redis>(REDIS_PUBSUB_SUB);

    // Wait for both clients to be ready
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        if (pubClient.status === 'ready') return resolve();
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        if (subClient.status === 'ready') return resolve();
        subClient.once('ready', resolve);
        subClient.once('error', reject);
      }),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis IO Adapter connected');
  }

  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
