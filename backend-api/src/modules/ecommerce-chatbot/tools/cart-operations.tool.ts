import { Injectable, Logger } from '@nestjs/common';
import { Cart } from '../interfaces/ecommerce.interface';
import { MockCartService } from '../mock/mock-cart.service';
import { ProductLookupTool } from './product-lookup.tool';

export interface CartOperationResult {
  success: boolean;
  cart: Cart;
  message: string;
  affectedItem?: string;
}

@Injectable()
export class CartOperationsTool {
  private readonly logger = new Logger(CartOperationsTool.name);

  constructor(
    private readonly cartService: MockCartService,
    private readonly productLookup: ProductLookupTool,
  ) {}

  addByName(
    customerId: string,
    productName: string,
    quantity: number = 1,
  ): CartOperationResult {
    const { product, confidence } = this.productLookup.lookup(productName);

    if (!product) {
      return {
        success: false,
        cart: this.cartService.getCart(customerId),
        message: `Không tìm thấy sản phẩm "${productName}". Bạn có thể mô tả rõ hơn không?`,
      };
    }

    if (!product.inStock) {
      return {
        success: false,
        cart: this.cartService.getCart(customerId),
        message: `"${product.name}" hiện đang hết hàng.`,
        affectedItem: product.name,
      };
    }

    const cart = this.cartService.addItem(customerId, product, quantity);

    return {
      success: true,
      cart,
      message: `Đã thêm ${quantity}x "${product.name}" (${product.price.toLocaleString('vi-VN')} đ) vào giỏ hàng.`,
      affectedItem: product.name,
    };
  }

  addById(
    customerId: string,
    productId: string,
    quantity: number = 1,
  ): CartOperationResult {
    const product = this.productLookup.lookupById(productId);

    if (!product) {
      return {
        success: false,
        cart: this.cartService.getCart(customerId),
        message: `Không tìm thấy sản phẩm với ID "${productId}".`,
      };
    }

    const cart = this.cartService.addItem(customerId, product, quantity);
    return {
      success: true,
      cart,
      message: `Đã thêm ${quantity}x "${product.name}" vào giỏ hàng.`,
      affectedItem: product.name,
    };
  }

  removeByName(customerId: string, productName: string): CartOperationResult {
    const cart = this.cartService.getCart(customerId);
    const item = cart.items.find((i) =>
      i.productName.toLowerCase().includes(productName.toLowerCase()),
    );

    if (!item) {
      return {
        success: false,
        cart,
        message: `Không tìm thấy "${productName}" trong giỏ hàng.`,
      };
    }

    const updatedCart = this.cartService.removeItem(
      customerId,
      item.productId,
    );
    return {
      success: true,
      cart: updatedCart,
      message: `Đã xóa "${item.productName}" khỏi giỏ hàng.`,
      affectedItem: item.productName,
    };
  }

  removeByIndex(customerId: string, index: number): CartOperationResult {
    const cart = this.cartService.getCart(customerId);
    if (index < 0 || index >= cart.items.length) {
      return {
        success: false,
        cart,
        message: `Giỏ hàng chỉ có ${cart.items.length} sản phẩm, không thể xóa vị trí ${index + 1}.`,
      };
    }

    const itemName = cart.items[index].productName;
    const updatedCart = this.cartService.removeItemByIndex(customerId, index);
    return {
      success: true,
      cart: updatedCart,
      message: `Đã xóa "${itemName}" khỏi giỏ hàng.`,
      affectedItem: itemName,
    };
  }

  updateQuantity(
    customerId: string,
    productName: string,
    quantity: number,
  ): CartOperationResult {
    const cart = this.cartService.getCart(customerId);
    const item = cart.items.find((i) =>
      i.productName.toLowerCase().includes(productName.toLowerCase()),
    );

    if (!item) {
      return {
        success: false,
        cart,
        message: `Không tìm thấy "${productName}" trong giỏ hàng.`,
      };
    }

    const updatedCart = this.cartService.updateQuantity(
      customerId,
      item.productId,
      quantity,
    );
    return {
      success: true,
      cart: updatedCart,
      message: `Đã cập nhật "${item.productName}" thành ${quantity} cái.`,
      affectedItem: item.productName,
    };
  }

  viewCart(customerId: string): CartOperationResult {
    const cart = this.cartService.getCart(customerId);
    return {
      success: true,
      cart,
      message:
        cart.items.length > 0
          ? `Giỏ hàng có ${cart.totalItems} sản phẩm.`
          : 'Giỏ hàng đang trống.',
    };
  }

  clearCart(customerId: string): CartOperationResult {
    const cart = this.cartService.clearCart(customerId);
    return {
      success: true,
      cart,
      message: 'Đã xóa toàn bộ giỏ hàng.',
    };
  }

  formatCartSummary(cart: Cart): string {
    if (cart.items.length === 0) return '(Giỏ hàng trống)';

    return cart.items
      .map(
        (item, i) =>
          `${i + 1}. ${item.productName} x${item.quantity} - ${item.subtotal.toLocaleString('vi-VN')} đ`,
      )
      .join('\n');
  }
}
