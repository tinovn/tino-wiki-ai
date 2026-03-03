import { Injectable, Logger } from '@nestjs/common';
import { RankedSearchResult } from '../interfaces/graph-state.interface';
import { MockProductCatalogService } from '../mock/mock-product-catalog.service';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

/**
 * Code-based reranking — no LLM call, pure deterministic scoring.
 * Rules from PRD: exact name match +3, keyword match +1, category match +0.5
 */
@Injectable()
export class RerankerNode {
  private readonly logger = new Logger(RerankerNode.name);

  constructor(private readonly catalog: MockProductCatalogService) {}

  rerank(query: string, results: RankedSearchResult[]): RankedSearchResult[] {
    const queryLower = query.toLowerCase();
    const queryTokens = queryLower
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const reranked = results.map((result) => {
      let boost = 0;
      const heading = (result.heading ?? '').toLowerCase();
      const content = result.content.toLowerCase();
      const category = (result.metadata?.category ?? '').toLowerCase();

      // Rule 1: Exact product name match (+3)
      if (heading && queryLower.includes(heading)) {
        boost += ECOMMERCE_CONSTANTS.RERANK_EXACT_NAME_MATCH;
      } else if (heading && heading.includes(queryLower)) {
        boost += ECOMMERCE_CONSTANTS.RERANK_EXACT_NAME_MATCH * 0.8;
      }

      // Rule 2: Keyword match in product name/description (+1 per keyword)
      for (const token of queryTokens) {
        if (heading.includes(token)) {
          boost += ECOMMERCE_CONSTANTS.RERANK_KEYWORD_MATCH;
        } else if (content.includes(token)) {
          boost += ECOMMERCE_CONSTANTS.RERANK_KEYWORD_MATCH * 0.5;
        }
      }

      // Rule 3: Category match (+0.5)
      if (category && this.categoryMatch(queryLower, category)) {
        boost += ECOMMERCE_CONSTANTS.RERANK_CATEGORY_MATCH;
      }

      // Bonus: in-stock preference
      if (result.metadata?.inStock === true) {
        boost += 0.1;
      }

      return {
        ...result,
        rerankedScore: result.score + boost,
      };
    });

    return reranked.sort((a, b) => b.rerankedScore - a.rerankedScore);
  }

  private categoryMatch(query: string, category: string): boolean {
    const categoryKeywords: Record<string, string[]> = {
      'điện thoại': ['điện thoại', 'phone', 'dt', 'dien thoai', 'iphone', 'samsung', 'xiaomi'],
      'laptop': ['laptop', 'máy tính', 'may tinh', 'notebook', 'macbook'],
      'tai nghe': ['tai nghe', 'headphone', 'earphone', 'airpods', 'earbuds'],
      'loa': ['loa', 'speaker'],
      'đồng hồ thông minh': ['đồng hồ', 'watch', 'smartwatch', 'dong ho'],
      'phụ kiện': ['phụ kiện', 'sạc', 'ốp', 'cáp', 'chuột', 'bàn phím', 'pin dự phòng'],
      'máy tính bảng': ['tablet', 'ipad', 'máy tính bảng', 'may tinh bang'],
    };

    const catLower = category.toLowerCase();
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (catLower.includes(cat) || cat.includes(catLower)) {
        if (keywords.some((kw) => query.includes(kw))) return true;
      }
    }
    return false;
  }
}
