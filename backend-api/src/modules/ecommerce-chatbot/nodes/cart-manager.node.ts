import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import {
  GraphState,
  EcommerceIntent,
  IntentResult,
} from '../interfaces/graph-state.interface';
import { CartOperationsTool } from '../tools/cart-operations.tool';
import {
  CART_MANAGER_SYSTEM_PROMPT,
  CART_ADD_USER_PROMPT,
  CART_VIEW_USER_PROMPT,
  CART_REMOVE_USER_PROMPT,
  CART_CLEAR_USER_PROMPT,
} from '../prompts/cart-manager.prompt';

@Injectable()
export class CartManagerNode {
  private readonly logger = new Logger(CartManagerNode.name);

  constructor(
    private readonly llmFactory: LlmProviderFactory,
    private readonly cartOps: CartOperationsTool,
  ) {}

  async execute(
    intent: EcommerceIntent,
    state: GraphState,
  ): Promise<IntentResult> {
    const { customerId, userMessage } = state;

    switch (intent.name) {
      case 'cart_add':
        return this.handleAdd(customerId, intent, userMessage);
      case 'cart_remove':
        return this.handleRemove(customerId, intent, userMessage);
      case 'cart_update':
        return this.handleUpdate(customerId, intent, userMessage);
      case 'cart_view':
        return this.handleView(customerId);
      case 'cart_clear':
        return this.handleClear(customerId);
      default:
        return this.handleView(customerId);
    }
  }

  private async handleAdd(
    customerId: string,
    intent: EcommerceIntent,
    userMessage: string,
  ): Promise<IntentResult> {
    const productName =
      (intent.extractedParams.productName as string) ?? userMessage;
    const quantity = (intent.extractedParams.quantity as number) ?? 1;

    const result = this.cartOps.addByName(customerId, productName, quantity);

    return this.generateResponse(
      'cart_add',
      result.success
        ? CART_ADD_USER_PROMPT
            .replace('{userMessage}', userMessage)
            .replace('{productName}', result.affectedItem ?? productName)
            .replace('{quantity}', String(quantity))
            .replace('{unitPrice}', this.getItemPrice(result.cart, result.affectedItem))
            .replace('{cartSummary}', this.cartOps.formatCartSummary(result.cart))
            .replace('{totalAmount}', result.cart.totalAmount.toLocaleString('vi-VN'))
            .replace('{totalItems}', String(result.cart.totalItems))
        : result.message,
      result.success,
      result.cart,
    );
  }

  private async handleRemove(
    customerId: string,
    intent: EcommerceIntent,
    userMessage: string,
  ): Promise<IntentResult> {
    const productName = intent.extractedParams.productName as string;
    const index = intent.extractedParams.index as number;

    let result;
    if (typeof index === 'number') {
      result = this.cartOps.removeByIndex(customerId, index - 1); // 1-indexed from user
    } else if (productName) {
      result = this.cartOps.removeByName(customerId, productName);
    } else {
      // Try to extract from message context
      result = this.cartOps.removeByName(customerId, userMessage);
    }

    return this.generateResponse(
      'cart_remove',
      result.success
        ? CART_REMOVE_USER_PROMPT
            .replace('{userMessage}', userMessage)
            .replace('{removedItem}', result.affectedItem ?? 'sản phẩm')
            .replace('{cartSummary}', this.cartOps.formatCartSummary(result.cart))
            .replace('{totalAmount}', result.cart.totalAmount.toLocaleString('vi-VN'))
            .replace('{totalItems}', String(result.cart.totalItems))
        : result.message,
      result.success,
      result.cart,
    );
  }

  private async handleUpdate(
    customerId: string,
    intent: EcommerceIntent,
    userMessage: string,
  ): Promise<IntentResult> {
    const productName = intent.extractedParams.productName as string;
    const quantity = intent.extractedParams.quantity as number;

    if (!productName || !quantity) {
      return {
        intentName: 'cart_update',
        response:
          'Mình cần biết tên sản phẩm và số lượng muốn đổi. Ví dụ: "đổi AirPods thành 2 cái"',
        toolResults: [],
        confidence: 0.5,
      };
    }

    const result = this.cartOps.updateQuantity(
      customerId,
      productName,
      quantity,
    );

    return this.generateResponse(
      'cart_update',
      result.message,
      result.success,
      result.cart,
    );
  }

  private async handleView(customerId: string): Promise<IntentResult> {
    const result = this.cartOps.viewCart(customerId);
    const summary = this.cartOps.formatCartSummary(result.cart);

    return this.generateResponse(
      'cart_view',
      CART_VIEW_USER_PROMPT
        .replace('{cartSummary}', summary)
        .replace('{totalAmount}', result.cart.totalAmount.toLocaleString('vi-VN'))
        .replace('{totalItems}', String(result.cart.totalItems)),
      true,
      result.cart,
    );
  }

  private async handleClear(customerId: string): Promise<IntentResult> {
    this.cartOps.clearCart(customerId);

    return this.generateResponse('cart_clear', CART_CLEAR_USER_PROMPT, true);
  }

  private async generateResponse(
    intentName: string,
    promptContent: string,
    success: boolean,
    cart?: any,
  ): Promise<IntentResult> {
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const response = await chatAdapter.chat([
        { role: 'system', content: CART_MANAGER_SYSTEM_PROMPT },
        { role: 'user', content: promptContent },
      ]);

      return {
        intentName: intentName as any,
        response: response.content,
        toolResults: cart
          ? [{ toolName: 'cart_operation', data: cart, naturalLanguageInput: promptContent }]
          : [],
        confidence: success ? 0.95 : 0.5,
      };
    } catch {
      // Fallback: return the raw prompt content as response
      return {
        intentName: intentName as any,
        response: promptContent,
        toolResults: [],
        confidence: success ? 0.8 : 0.4,
      };
    }
  }

  private getItemPrice(cart: any, itemName?: string): string {
    if (!itemName || !cart?.items) return '?';
    const item = cart.items.find(
      (i: any) =>
        i.productName?.toLowerCase().includes(itemName.toLowerCase()),
    );
    return item?.unitPrice?.toLocaleString('vi-VN') ?? '?';
  }
}
