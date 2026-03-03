import { EcommerceIntentType } from '../interfaces/graph-state.interface';

/**
 * Pairs of intents that are safe to execute in parallel.
 * Any pair NOT in this list defaults to sequential execution.
 */
export const PARALLEL_SAFE_PAIRS: [EcommerceIntentType, EcommerceIntentType][] = [
  ['product_search', 'cart_view'],
  ['product_search', 'order_status'],
  ['product_search', 'order_history'],
  ['product_search', 'knowledge_query'],
  ['product_search', 'product_search'],
  ['product_detail', 'cart_view'],
  ['product_detail', 'order_status'],
  ['product_detail', 'knowledge_query'],
  ['product_compare', 'cart_view'],
  ['cart_view', 'order_status'],
  ['cart_view', 'order_history'],
  ['cart_view', 'knowledge_query'],
  ['order_status', 'knowledge_query'],
  ['order_history', 'knowledge_query'],
];

export function isParallelSafe(a: EcommerceIntentType, b: EcommerceIntentType): boolean {
  return PARALLEL_SAFE_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

export function canRunParallel(intents: EcommerceIntentType[]): boolean {
  if (intents.length <= 1) return true;
  for (let i = 0; i < intents.length; i++) {
    for (let j = i + 1; j < intents.length; j++) {
      if (!isParallelSafe(intents[i], intents[j])) return false;
    }
  }
  return true;
}
