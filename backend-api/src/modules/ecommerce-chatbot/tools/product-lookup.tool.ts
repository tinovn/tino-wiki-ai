import { Injectable, Logger } from '@nestjs/common';
import { Product } from '../interfaces/ecommerce.interface';
import { MockProductCatalogService } from '../mock/mock-product-catalog.service';

export interface LookupResult {
  product: Product | null;
  confidence: number;
  alternatives: Product[];
}

/**
 * Product lookup by natural language name (not ID).
 * Used by CartManager when customer says "thêm AirPods" instead of product ID.
 */
@Injectable()
export class ProductLookupTool {
  private readonly logger = new Logger(ProductLookupTool.name);

  constructor(private readonly catalog: MockProductCatalogService) {}

  lookup(query: string): LookupResult {
    const { product, confidence } = this.catalog.fuzzyLookup(query);

    if (!product) {
      return { product: null, confidence: 0, alternatives: [] };
    }

    // Get alternatives from same category
    const alternatives =
      confidence < 0.8
        ? this.catalog
            .searchByName(query)
            .filter((p) => p.id !== product.id)
            .slice(0, 3)
        : [];

    return { product, confidence, alternatives };
  }

  lookupById(productId: string): Product | null {
    return this.catalog.getById(productId);
  }
}
