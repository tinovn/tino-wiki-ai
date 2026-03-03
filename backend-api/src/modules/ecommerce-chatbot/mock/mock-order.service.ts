import { Injectable, Logger } from '@nestjs/common';
import { Order, Cart } from '../interfaces/ecommerce.interface';
import { MOCK_ORDERS } from './mock-data';

@Injectable()
export class MockOrderService {
  private readonly logger = new Logger(MockOrderService.name);
  private readonly orders = new Map<string, Order[]>();
  private orderCounter = 100;

  constructor() {
    this.seedOrders();
  }

  private seedOrders(): void {
    for (const order of MOCK_ORDERS) {
      const existing = this.orders.get(order.customerId) ?? [];
      existing.push(order);
      this.orders.set(order.customerId, existing);
    }
  }

  getOrders(customerId: string): Order[] {
    return this.orders.get(customerId) ?? [];
  }

  getOrderById(orderId: string): Order | null {
    for (const orders of this.orders.values()) {
      const found = orders.find((o) => o.id === orderId);
      if (found) return found;
    }
    return null;
  }

  getLatestOrder(customerId: string): Order | null {
    const orders = this.getOrders(customerId);
    if (orders.length === 0) return null;
    return orders.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
  }

  createOrder(
    customerId: string,
    cart: Cart,
    customerInfo: {
      name?: string;
      phone?: string;
      address?: string;
      paymentMethod?: string;
    },
  ): Order {
    this.orderCounter++;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    const order: Order = {
      id: `ORD-${dateStr}-${String(this.orderCounter).padStart(3, '0')}`,
      customerId,
      items: [...cart.items],
      totalAmount: cart.totalAmount,
      status: 'pending',
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      shippingAddress: customerInfo.address,
      paymentMethod: customerInfo.paymentMethod ?? 'COD',
      createdAt: now,
      updatedAt: now,
      estimatedDelivery: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
    };

    const existing = this.orders.get(customerId) ?? [];
    existing.push(order);
    this.orders.set(customerId, existing);

    this.logger.log(
      `Created order ${order.id} for customer ${customerId}, total: ${order.totalAmount} VND`,
    );
    return order;
  }
}
