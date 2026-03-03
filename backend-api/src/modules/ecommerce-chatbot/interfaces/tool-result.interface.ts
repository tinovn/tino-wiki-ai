import { Product, Cart, Order } from './ecommerce.interface';

export interface ProductSearchToolResult {
  toolName: 'product_search';
  query: string;
  products: Product[];
  totalFound: number;
  searchMethod: 'vector' | 'fuzzy' | 'deterministic';
}

export interface ProductLookupToolResult {
  toolName: 'product_lookup';
  query: string;
  product: Product | null;
  matchConfidence: number;
}

export interface CartOperationToolResult {
  toolName: 'cart_operation';
  operation: 'add' | 'remove' | 'update' | 'view' | 'clear';
  cart: Cart;
  affectedItem?: string;
}

export interface OrderLookupToolResult {
  toolName: 'order_lookup';
  orders: Order[];
  query: string;
}

export interface DeterministicSortToolResult {
  toolName: 'deterministic_sort';
  sortType: 'most_expensive' | 'cheapest' | 'newest' | 'best_rated';
  products: Product[];
}

export type EcommerceToolResult =
  | ProductSearchToolResult
  | ProductLookupToolResult
  | CartOperationToolResult
  | OrderLookupToolResult
  | DeterministicSortToolResult;
