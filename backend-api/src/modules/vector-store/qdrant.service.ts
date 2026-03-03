import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService implements OnModuleInit {
  private readonly logger = new Logger(QdrantService.name);
  private client: QdrantClient;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('qdrant.url', 'http://localhost:6333');
    const apiKey = this.configService.get<string>('qdrant.apiKey');

    this.client = new QdrantClient({
      url,
      apiKey: apiKey || undefined,
      checkCompatibility: false,
    });

    try {
      const result = await this.client.getCollections();
      this.logger.log(`Qdrant connected. Collections: ${result.collections.length}`);
    } catch (error) {
      this.logger.error('Failed to connect to Qdrant', error);
    }
  }

  getClient(): QdrantClient {
    return this.client;
  }
}
