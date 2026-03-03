import { Injectable, Logger } from '@nestjs/common';
import { Product } from '../interfaces/ecommerce.interface';
import { MOCK_PRODUCTS } from './mock-data';
import { DeterministicSortType } from '../constants/ecommerce.constants';

@Injectable()
export class MockProductCatalogService {
  private readonly logger = new Logger(MockProductCatalogService.name);
  private readonly products: Product[] = MOCK_PRODUCTS;

  getAll(): Product[] {
    return this.products;
  }

  getById(id: string): Product | null {
    return this.products.find((p) => p.id === id) ?? null;
  }

  searchByName(query: string): Product[] {
    const q = query.toLowerCase();
    const tokens = q.split(/\s+/).filter((t) => t.length > 1);

    return this.products
      .map((product) => {
        const name = product.name.toLowerCase();
        const desc = product.description.toLowerCase();
        const tags = product.tags.join(' ').toLowerCase();
        const text = `${name} ${desc} ${tags}`;

        let score = 0;
        // Exact name match
        if (name.includes(q)) score += 10;
        // Token matches
        for (const token of tokens) {
          if (name.includes(token)) score += 3;
          if (desc.includes(token)) score += 1;
          if (tags.includes(token)) score += 2;
        }
        // Brand match
        if (product.brand.toLowerCase().includes(q)) score += 5;
        // Category match
        if (product.category.toLowerCase().includes(q)) score += 4;

        return { product, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ product }) => product);
  }

  getByCategory(category: string): Product[] {
    const cat = category.toLowerCase();
    return this.products.filter(
      (p) =>
        p.category.toLowerCase().includes(cat) ||
        (p.subcategory && p.subcategory.toLowerCase().includes(cat)),
    );
  }

  filterByPriceRange(min?: number, max?: number): Product[] {
    return this.products.filter((p) => {
      if (min !== undefined && p.price < min) return false;
      if (max !== undefined && p.price > max) return false;
      return true;
    });
  }

  filterInStock(): Product[] {
    return this.products.filter((p) => p.inStock && p.stockQuantity > 0);
  }

  sortByPrice(products: Product[], order: 'asc' | 'desc'): Product[] {
    return [...products].sort((a, b) =>
      order === 'asc' ? a.price - b.price : b.price - a.price,
    );
  }

  sortByRating(products: Product[], order: 'asc' | 'desc'): Product[] {
    return [...products].sort((a, b) =>
      order === 'asc' ? a.rating - b.rating : b.rating - a.rating,
    );
  }

  sortByPopularity(products: Product[]): Product[] {
    return [...products].sort((a, b) => b.reviewCount - a.reviewCount);
  }

  deterministicSort(
    products: Product[],
    sortType: DeterministicSortType,
  ): Product[] {
    switch (sortType) {
      case 'MOST_EXPENSIVE':
        return this.sortByPrice(products, 'desc');
      case 'CHEAPEST':
        return this.sortByPrice(products, 'asc');
      case 'BEST_RATED':
        return this.sortByRating(products, 'desc');
      case 'NEWEST':
        // For mock data, use rating as proxy for "newest"
        return this.sortByRating(products, 'desc');
      default:
        return products;
    }
  }

  /**
   * Fuzzy lookup: find the best-matching product by name.
   * Used by CartManager when customer says "thêm dầu dừa" instead of product ID.
   */
  fuzzyLookup(query: string): { product: Product | null; confidence: number } {
    const results = this.searchByName(query);
    if (results.length === 0) return { product: null, confidence: 0 };

    const topMatch = results[0];
    const q = query.toLowerCase();
    const name = topMatch.name.toLowerCase();

    // Calculate confidence based on match quality
    let confidence = 0.5;
    if (name === q) confidence = 1.0;
    else if (name.includes(q)) confidence = 0.9;
    else if (q.includes(name)) confidence = 0.8;
    else confidence = Math.min(0.7, 0.3 + results.length * 0.1);

    return { product: topMatch, confidence };
  }
}
