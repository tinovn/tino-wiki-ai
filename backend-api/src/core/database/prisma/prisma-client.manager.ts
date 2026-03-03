import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '.prisma/tenant-client';

@Injectable()
export class PrismaClientManager implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaClientManager.name);
  private readonly clients = new Map<string, PrismaClient>();
  private readonly MAX_CLIENTS = 50;

  async getClient(databaseUrl: string): Promise<PrismaClient> {
    if (this.clients.has(databaseUrl)) {
      return this.clients.get(databaseUrl)!;
    }

    if (this.clients.size >= this.MAX_CLIENTS) {
      // Evict least recently used (first inserted)
      const [oldestUrl, oldestClient] = this.clients.entries().next().value;
      await oldestClient.$disconnect();
      this.clients.delete(oldestUrl);
      this.logger.warn(`Evicted tenant DB client: ${oldestUrl.substring(0, 30)}...`);
    }

    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });

    await client.$connect();
    this.clients.set(databaseUrl, client);
    this.logger.debug(`Created tenant DB client (pool size: ${this.clients.size})`);

    return client;
  }

  async onModuleDestroy() {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.$disconnect(),
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
    this.logger.log('All tenant DB clients disconnected');
  }
}
