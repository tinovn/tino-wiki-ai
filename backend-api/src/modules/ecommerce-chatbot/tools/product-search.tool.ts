import { Injectable, Logger } from '@nestjs/common';
import { Product } from '../interfaces/ecommerce.interface';
import { RankedSearchResult } from '../interfaces/graph-state.interface';
import { MockProductCatalogService } from '../mock/mock-product-catalog.service';
import { ECOMMERCE_CONSTANTS } from '../constants/ecommerce.constants';

/**
 * Product search tool using fuzzy text matching against mock catalog.
 * In production, this would use VectorStoreService for semantic search.
 */
@Injectable()
export class ProductSearchTool {
  private readonly logger = new Logger(ProductSearchTool.name);

  constructor(private readonly catalog: MockProductCatalogService) {}

  async search(queries: string[]): Promise<RankedSearchResult[]> {
    const allResults = new Map<string, RankedSearchResult>();

    for (const query of queries) {
      const products = this.catalog.searchByName(query);

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const score = 1.0 - i * 0.05; // Decay by position

        if (!allResults.has(product.id) || allResults.get(product.id)!.score < score) {
          allResults.set(product.id, {
            id: product.id,
            content: this.productToContent(product),
            heading: product.name,
            score,
            rerankedScore: score, // Will be updated by reranker
            source: 'product',
            metadata: {
              productId: product.id,
              price: product.price,
              category: product.category,
              brand: product.brand,
              inStock: product.inStock,
              rating: product.rating,
            },
          });
        }
      }
    }

    return Array.from(allResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, ECOMMERCE_CONSTANTS.PRODUCT_SEARCH_LIMIT);
  }

  private productToContent(product: Product): string {
    const parts = [
      product.name,
      product.shortDescription,
      `Giá: ${product.price.toLocaleString('vi-VN')} đ`,
    ];
    if (product.originalPrice && product.discount) {
      parts.push(
        `Giá gốc: ${product.originalPrice.toLocaleString('vi-VN')} đ (Giảm ${product.discount}%)`,
      );
    }
    parts.push(`Thương hiệu: ${product.brand}`);
    parts.push(`Danh mục: ${product.category}`);
    if (product.specs) {
      const specsStr = Object.entries(product.specs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      parts.push(`Thông số: ${specsStr}`);
    }
    parts.push(product.inStock ? 'Còn hàng' : 'Hết hàng');
    parts.push(`Đánh giá: ${product.rating}/5 (${product.reviewCount} reviews)`);
    return parts.join('. ');
  }
}
