import { Injectable, Logger } from '@nestjs/common';
import { AI_CONSTANTS } from '@common/constants';
import { VectorSearchResult } from '@modules/vector-store/interfaces/vector-point.interface';
import { MergedSearchResult } from '../interfaces/search-result.interface';

@Injectable()
export class ContextMergerService {
  private readonly logger = new Logger(ContextMergerService.name);

  merge(
    customerResults: VectorSearchResult[],
    tenantResults: VectorSearchResult[],
    masterResults: VectorSearchResult[],
  ): MergedSearchResult[] {
    const boostScores = AI_CONSTANTS.SCORE_BOOST;

    // Apply score boosting per layer
    const boosted: MergedSearchResult[] = [
      ...customerResults.map((r) => ({
        documentId: r.payload.documentId,
        chunkContent: r.payload.content,
        heading: r.payload.heading,
        score: r.score * boostScores.CUSTOMER,
        layer: 'customer',
        intents: r.payload.intents,
      })),
      ...tenantResults.map((r) => ({
        documentId: r.payload.documentId,
        chunkContent: r.payload.content,
        heading: r.payload.heading,
        score: r.score * boostScores.TENANT,
        layer: 'tenant',
        intents: r.payload.intents,
      })),
      ...masterResults.map((r) => ({
        documentId: r.payload.documentId,
        chunkContent: r.payload.content,
        heading: r.payload.heading,
        score: r.score * boostScores.MASTER,
        layer: 'master',
        intents: r.payload.intents,
      })),
    ];

    // Sort by boosted score
    boosted.sort((a, b) => b.score - a.score);

    // Deduplicate by documentId + heading (keep highest score)
    const seen = new Set<string>();
    const deduplicated: MergedSearchResult[] = [];

    for (const result of boosted) {
      const key = `${result.documentId}:${result.heading || 'no-heading'}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    // Limit to max results
    return deduplicated.slice(0, AI_CONSTANTS.MAX_SEARCH_RESULTS);
  }
}
