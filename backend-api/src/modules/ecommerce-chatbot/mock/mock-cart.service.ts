import { Injectable, Logger } from '@nestjs/common';
import { Cart, CartItem, Product } from '../interfaces/ecommerce.interface';

@Injectable()
export class MockCartService {
  private readonly logger = new Logger(MockCartService.name);
  private readonly carts = new Map<string, Cart>();

  getCart(customerId: string): Cart {
    if (!this.carts.has(customerId)) {
      this.carts.set(customerId, {
        customerId,
        items: [],
        totalItems: 0,
        totalAmount: 0,
        currency: 'VND',
        updatedAt: new Date(),
      });
    }
    return this.carts.get(customerId)!;
  }

  addItem(
    customerId: string,
    product: Product,
    quantity: number = 1,
    variantId?: string,
  ): Cart {
    const cart = this.getCart(customerId);

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId === product.id &&
        item.variantId === (variantId ?? undefined),
    );

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
      cart.items[existingIndex].subtotal =
        cart.items[existingIndex].quantity *
        cart.items[existingIndex].unitPrice;
    } else {
      const variant = variantId
        ? product.variants?.find((v) => v.id === variantId)
        : undefined;

      const item: CartItem = {
        productId: product.id,
        productName: variant
          ? `${product.name} - ${variant.name}`
          : product.name,
        variantId: variantId,
        variantName: variant?.name,
        quantity,
        unitPrice: variant?.price ?? product.price,
        subtotal: (variant?.price ?? product.price) * quantity,
      };
      cart.items.push(item);
    }

    this.recalculate(cart);
    this.logger.log(
      `Added ${quantity}x "${product.name}" to cart of customer ${customerId}`,
    );
    return cart;
  }

  removeItem(customerId: string, productId: string): Cart {
    const cart = this.getCart(customerId);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    this.recalculate(cart);
    return cart;
  }

  removeItemByIndex(customerId: string, index: number): Cart {
    const cart = this.getCart(customerId);
    if (index >= 0 && index < cart.items.length) {
      cart.items.splice(index, 1);
    }
    this.recalculate(cart);
    return cart;
  }

  updateQuantity(
    customerId: string,
    productId: string,
    quantity: number,
  ): Cart {
    const cart = this.getCart(customerId);
    const item = cart.items.find((i) => i.productId === productId);
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(customerId, productId);
      }
      item.quantity = quantity;
      item.subtotal = item.unitPrice * quantity;
    }
    this.recalculate(cart);
    return cart;
  }

  clearCart(customerId: string): Cart {
    const cart = this.getCart(customerId);
    cart.items = [];
    this.recalculate(cart);
    return cart;
  }

  private recalculate(cart: Cart): void {
    cart.totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.totalAmount = cart.items.reduce(
      (sum, item) => sum + item.subtotal,
      0,
    );
    cart.updatedAt = new Date();
  }
}
