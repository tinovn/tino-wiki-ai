import { Injectable, Logger } from '@nestjs/common';
import { Product } from '../interfaces/ecommerce.interface';
import { MockProductCatalogService } from '../mock/mock-product-catalog.service';
import {
  DETERMINISTIC_KEYWORDS,
  DeterministicSortType,
} from '../constants/ecommerce.constants';

export interface DeterministicSortResult {
  detected: boolean;
  sortType: DeterministicSortType | null;
  products: Product[];
}

/**
 * Deterministic sort: detect keywords like "đắt nhất/rẻ nhất" and sort by code.
 * LLM is bad at sorting numbers — code sort is always correct.
 */
@Injectable()
export class DeterministicSortTool {
  private readonly logger = new Logger(DeterministicSortTool.name);

  constructor(private readonly catalog: MockProductCatalogService) {}

  detect(query: string): DeterministicSortResult {
    const queryLower = query.toLowerCase();

    for (const [sortType, keywords] of Object.entries(DETERMINISTIC_KEYWORDS)) {
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          this.logger.debug(
            `Deterministic sort detected: ${sortType} (keyword: "${keyword}")`,
          );

          // Extract category context from query if possible
          const products = this.getRelevantProducts(queryLower, keyword);
          const sorted = this.catalog.deterministicSort(
            products,
            sortType as DeterministicSortType,
          );

          return {
            detected: true,
            sortType: sortType as DeterministicSortType,
            products: sorted.slice(0, 5),
          };
        }
      }
    }

    return { detected: false, sortType: null, products: [] };
  }

  private getRelevantProducts(query: string, matchedKeyword: string): Product[] {
    // Remove the sort keyword to get the category/product context
    const contextQuery = query.replace(matchedKeyword, '').trim();

    if (contextQuery.length > 1) {
      const results = this.catalog.searchByName(contextQuery);
      if (results.length > 0) return results;
    }

    // Fallback: check for known categories
    const categoryMap: Record<string, string> = {
      'điện thoại': 'Điện thoại',
      'dien thoai': 'Điện thoại',
      'phone': 'Điện thoại',
      'laptop': 'Laptop',
      'tai nghe': 'Tai nghe',
      'loa': 'Loa',
      'đồng hồ': 'Đồng hồ thông minh',
      'tablet': 'Máy tính bảng',
      'phụ kiện': 'Phụ kiện',
    };

    for (const [keyword, category] of Object.entries(categoryMap)) {
      if (query.includes(keyword)) {
        return this.catalog.getByCategory(category);
      }
    }

    // Fallback: all in-stock products
    return this.catalog.filterInStock();
  }
}
