import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { QdrantService } from './qdrant.service';
import { CollectionManager } from './collection.manager';
import {
  VectorPointPayload,
  VectorSearchParams,
  VectorSearchResult,
} from './interfaces/vector-point.interface';

@Injectable()
export class VectorStoreService {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    private readonly qdrant: QdrantService,
    private readonly collectionManager: CollectionManager,
  ) {}

  async upsert(
    tenantSlug: string,
    points: Array<{ id?: string; vector: number[]; payload: VectorPointPayload }>,
  ): Promise<string[]> {
    await this.collectionManager.ensureCollection(tenantSlug);
    const collectionName = this.collectionManager.getCollectionName(tenantSlug);
    const client = this.qdrant.getClient();

    const pointIds: string[] = [];
    const qdrantPoints = points.map((p) => {
      const id = p.id || uuid();
      pointIds.push(id);
      return { id, vector: p.vector, payload: p.payload as any };
    });

    await client.upsert(collectionName, {
      wait: true,
      points: qdrantPoints,
    });

    this.logger.debug(`Upserted ${points.length} points to "${collectionName}"`);
    return pointIds;
  }

  async search(tenantSlug: string, params: VectorSearchParams): Promise<VectorSearchResult[]> {
    await this.collectionManager.ensureCollection(tenantSlug);
    const collectionName = this.collectionManager.getCollectionName(tenantSlug);
    const client = this.qdrant.getClient();

    const results = await client.search(collectionName, {
      vector: params.vector,
      limit: params.limit,
      filter: params.filter ? { must: this.buildFilter(params.filter) } : undefined,
      score_threshold: params.scoreThreshold || 0.5,
      with_payload: true,
    });

    return results.map((r) => ({
      id: r.id as string,
      score: r.score,
      payload: r.payload as unknown as VectorPointPayload,
    }));
  }

  async deleteByDocumentId(tenantSlug: string, documentId: string): Promise<void> {
    // Ensure collection exists before attempting to delete (avoids "Not Found" on first run)
    await this.collectionManager.ensureCollection(tenantSlug);
    const collectionName = this.collectionManager.getCollectionName(tenantSlug);
    const client = this.qdrant.getClient();

    await client.delete(collectionName, {
      filter: {
        must: [{ key: 'documentId', match: { value: documentId } }],
      },
    });

    this.logger.debug(`Deleted vectors for document "${documentId}" from "${collectionName}"`);
  }

  async deleteByDocumentVersion(
    tenantSlug: string,
    documentId: string,
    version: number,
  ): Promise<void> {
    const collectionName = this.collectionManager.getCollectionName(tenantSlug);
    const client = this.qdrant.getClient();

    await client.delete(collectionName, {
      filter: {
        must: [
          { key: 'documentId', match: { value: documentId } },
          { key: 'version', match: { value: version } },
        ],
      },
    });
  }

  async getCollectionStats(tenantSlug: string): Promise<{ pointsCount: number }> {
    const collectionName = this.collectionManager.getCollectionName(tenantSlug);
    const client = this.qdrant.getClient();
    try {
      const info = await client.getCollection(collectionName);
      return { pointsCount: info.points_count ?? 0 };
    } catch {
      return { pointsCount: 0 };
    }
  }

  private buildFilter(filter: Record<string, any>): any[] {
    return Object.entries(filter).map(([key, value]) => ({
      key,
      match: { value },
    }));
  }
}
