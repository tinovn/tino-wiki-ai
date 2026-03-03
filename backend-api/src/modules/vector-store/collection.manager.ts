import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantService } from './qdrant.service';

@Injectable()
export class CollectionManager {
  private readonly logger = new Logger(CollectionManager.name);
  private readonly dimensions: number;

  constructor(
    private readonly qdrant: QdrantService,
    private readonly configService: ConfigService,
  ) {
    this.dimensions = this.configService.get<number>('embedding.dimensions', 1024);
  }

  getCollectionName(tenantSlug: string): string {
    return `tenant_${tenantSlug}_documents`;
  }

  async ensureCollection(tenantSlug: string): Promise<void> {
    const client = this.qdrant.getClient();
    const name = this.getCollectionName(tenantSlug);

    try {
      await client.getCollection(name);
      this.logger.debug(`Collection "${name}" already exists`);
    } catch {
      await client.createCollection(name, {
        vectors: { size: this.dimensions, distance: 'Cosine' },
      });

      // Create payload indexes for filtering
      await client.createPayloadIndex(name, {
        field_name: 'documentId',
        field_schema: 'keyword',
      });
      await client.createPayloadIndex(name, {
        field_name: 'layer',
        field_schema: 'keyword',
      });
      await client.createPayloadIndex(name, {
        field_name: 'customerId',
        field_schema: 'keyword',
      });
      await client.createPayloadIndex(name, {
        field_name: 'intents',
        field_schema: 'keyword',
      });
      await client.createPayloadIndex(name, {
        field_name: 'version',
        field_schema: 'integer',
      });

      this.logger.log(`Created collection "${name}" with ${this.dimensions}D vectors`);
    }
  }

  async deleteCollection(tenantSlug: string): Promise<void> {
    const client = this.qdrant.getClient();
    const name = this.getCollectionName(tenantSlug);

    try {
      await client.deleteCollection(name);
      this.logger.log(`Deleted collection "${name}"`);
    } catch (error) {
      this.logger.warn(`Failed to delete collection "${name}"`, error);
    }
  }
}
