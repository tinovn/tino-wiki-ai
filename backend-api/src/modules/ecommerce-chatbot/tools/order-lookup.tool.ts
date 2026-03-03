import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../interfaces/ecommerce.interface';
import { MockOrderService } from '../mock/mock-order.service';

const STATUS_VI: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao thành công',
  cancelled: 'Đã hủy',
};

@Injectable()
export class OrderLookupTool {
  private readonly logger = new Logger(OrderLookupTool.name);

  constructor(private readonly orderService: MockOrderService) {}

  getOrders(customerId: string): Order[] {
    return this.orderService.getOrders(customerId);
  }

  getLatestOrder(customerId: string): Order | null {
    return this.orderService.getLatestOrder(customerId);
  }

  getOrderById(orderId: string): Order | null {
    return this.orderService.getOrderById(orderId);
  }

  formatOrderDetails(order: Order): string {
    const items = order.items
      .map(
        (item) =>
          `  - ${item.productName} x${item.quantity} (${item.subtotal.toLocaleString('vi-VN')} đ)`,
      )
      .join('\n');

    return [
      `Mã đơn: ${order.id}`,
      `Trạng thái: ${STATUS_VI[order.status] ?? order.status}`,
      `Sản phẩm:\n${items}`,
      `Tổng tiền: ${order.totalAmount.toLocaleString('vi-VN')} đ`,
      order.shippingAddress ? `Giao đến: ${order.shippingAddress}` : '',
      order.trackingNumber ? `Mã vận đơn: ${order.trackingNumber}` : '',
      order.estimatedDelivery
        ? `Giao dự kiến: ${order.estimatedDelivery.toLocaleDateString('vi-VN')}`
        : '',
      `Ngày đặt: ${order.createdAt.toLocaleDateString('vi-VN')}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  formatOrdersHistory(orders: Order[]): string {
    if (orders.length === 0) return 'Chưa có đơn hàng nào.';

    return orders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(
        (o) =>
          `- ${o.id} | ${STATUS_VI[o.status]} | ${o.totalAmount.toLocaleString('vi-VN')} đ | ${o.createdAt.toLocaleDateString('vi-VN')}`,
      )
      .join('\n');
  }
}
