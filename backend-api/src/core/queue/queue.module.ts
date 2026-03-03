import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUES } from '@common/constants';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: QUEUES.AI_PIPELINE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      },
      { name: QUEUES.EMBEDDING },
      { name: QUEUES.SUMMARY },
      { name: QUEUES.PREFERENCE_EXTRACTION },
      { name: QUEUES.ANALYTICS },
      { name: QUEUES.CRAWLER },
      { name: QUEUES.NOTIFICATION },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
