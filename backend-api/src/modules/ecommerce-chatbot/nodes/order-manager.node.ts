import { Injectable, Logger } from '@nestjs/common';
import { LlmProviderFactory } from '../../llm/llm-provider.factory';
import {
  GraphState,
  EcommerceIntent,
  IntentResult,
} from '../interfaces/graph-state.interface';
import { OrderLookupTool } from '../tools/order-lookup.tool';
import { CartOperationsTool } from '../tools/cart-operations.tool';
import { MockOrderService } from '../mock/mock-order.service';
import { MockCartService } from '../mock/mock-cart.service';
import {
  ORDER_MANAGER_SYSTEM_PROMPT,
  ORDER_STATUS_USER_PROMPT,
  ORDER_HISTORY_USER_PROMPT,
  ORDER_CREATE_USER_PROMPT,
  ORDER_CREATED_USER_PROMPT,
} from '../prompts/order-manager.prompt';

@Injectable()
export class OrderManagerNode {
  private readonly logger = new Logger(OrderManagerNode.name);

  constructor(
    private readonly llmFactory: LlmProviderFactory,
    private readonly orderLookup: OrderLookupTool,
    private readonly cartOps: CartOperationsTool,
    private readonly orderService: MockOrderService,
    private readonly cartService: MockCartService,
  ) {}

  async execute(
    intent: EcommerceIntent,
    state: GraphState,
  ): Promise<IntentResult> {
    switch (intent.name) {
      case 'order_status':
        return this.handleStatus(state, intent);
      case 'order_history':
        return this.handleHistory(state);
      case 'order_create':
        return this.handleCreate(state, intent);
      default:
        return this.handleStatus(state, intent);
    }
  }

  private async handleStatus(
    state: GraphState,
    intent: EcommerceIntent,
  ): Promise<IntentResult> {
    const orderId = intent.extractedParams.orderId as string;

    let order;
    if (orderId) {
      order = this.orderLookup.getOrderById(orderId);
    } else {
      order = this.orderLookup.getLatestOrder(state.customerId);
    }

    if (!order) {
      return {
        intentName: 'order_status',
        response:
          'Mình không tìm thấy đơn hàng nào. Bạn có thể cho mình mã đơn hàng hoặc kiểm tra lại không?',
        toolResults: [],
        confidence: 0.5,
      };
    }

    const orderDetails = this.orderLookup.formatOrderDetails(order);
    return this.generateResponse(
      'order_status',
      ORDER_STATUS_USER_PROMPT.replace('{orderDetails}', orderDetails),
    );
  }

  private async handleHistory(state: GraphState): Promise<IntentResult> {
    const orders = this.orderLookup.getOrders(state.customerId);
    const historyText = this.orderLookup.formatOrdersHistory(orders);

    return this.generateResponse(
      'order_history',
      ORDER_HISTORY_USER_PROMPT.replace('{ordersHistory}', historyText),
    );
  }

  private async handleCreate(
    state: GraphState,
    intent: EcommerceIntent,
  ): Promise<IntentResult> {
    const cart = this.cartService.getCart(state.customerId);

    if (cart.items.length === 0) {
      return {
        intentName: 'order_create',
        response:
          'Giỏ hàng đang trống. Bạn cần thêm sản phẩm trước khi đặt đơn nhé!',
        toolResults: [],
        confidence: 0.9,
      };
    }

    const customerName = (intent.extractedParams.name as string) ??
      state.customerProfile?.preferences?.name ??
      '';
    const customerPhone = (intent.extractedParams.phone as string) ??
      state.customerProfile?.preferences?.phone ??
      '';
    const customerAddress = (intent.extractedParams.address as string) ??
      state.customerProfile?.preferences?.address ??
      '';

    // Check if we have all required info
    if (!customerPhone || !customerAddress) {
      const cartSummary = this.cartOps.formatCartSummary(cart);
      return this.generateResponse(
        'order_create',
        ORDER_CREATE_USER_PROMPT
          .replace('{cartSummary}', cartSummary)
          .replace('{totalAmount}', cart.totalAmount.toLocaleString('vi-VN'))
          .replace('{customerName}', customerName || '(chưa có)')
          .replace('{customerPhone}', customerPhone || '(chưa có)')
          .replace('{customerAddress}', customerAddress || '(chưa có)'),
      );
    }

    // Create the order
    const order = this.orderService.createOrder(state.customerId, cart, {
      name: customerName,
      phone: customerPhone,
      address: customerAddress,
    });

    // Clear cart after order
    this.cartService.clearCart(state.customerId);

    const orderItems = order.items
      .map((i) => `${i.productName} x${i.quantity}`)
      .join(', ');

    return this.generateResponse(
      'order_create',
      ORDER_CREATED_USER_PROMPT
        .replace('{orderId}', order.id)
        .replace('{orderItems}', orderItems)
        .replace('{totalAmount}', order.totalAmount.toLocaleString('vi-VN'))
        .replace(
          '{estimatedDelivery}',
          order.estimatedDelivery?.toLocaleDateString('vi-VN') ?? '3-5 ngày',
        )
        .replace('{paymentMethod}', order.paymentMethod ?? 'COD'),
    );
  }

  private async generateResponse(
    intentName: string,
    promptContent: string,
  ): Promise<IntentResult> {
    try {
      const chatAdapter = this.llmFactory.getChatAdapter();
      const response = await chatAdapter.chat([
        { role: 'system', content: ORDER_MANAGER_SYSTEM_PROMPT },
        { role: 'user', content: promptContent },
      ]);

      return {
        intentName: intentName as any,
        response: response.content,
        toolResults: [
          {
            toolName: 'order_lookup',
            data: promptContent,
            naturalLanguageInput: promptContent,
          },
        ],
        confidence: 0.9,
      };
    } catch {
      return {
        intentName: intentName as any,
        response: promptContent,
        toolResults: [],
        confidence: 0.7,
      };
    }
  }
}
