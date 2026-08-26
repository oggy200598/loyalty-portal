import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /** Lấy hoặc tạo cart cho user */
  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.carts.findUnique({
      where: { user_id: userId },
    });
    if (!cart) {
      cart = await this.prisma.carts.create({ data: { user_id: userId } });
    }
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.prisma.carts.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            products: {
              select: { id: true, name: true, price: true, stock_quantity: true },
            },
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!cart) return serialize({ id: null, items: [], totalItems: 0 });

    const totalItems = cart.cart_items.reduce((sum, i) => sum + i.quantity, 0);
    return serialize({ ...cart, totalItems });
  }

  async addItem(userId: string, productId: number, variantId: number | undefined, quantity: number) {
    const product = await this.prisma.products.findUnique({
      where: { id: BigInt(productId) },
      select: { id: true, price: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const cart = await this.getOrCreateCart(userId);

    // Nếu đã có item cùng product/variant thì cộng dồn số lượng
    const existing = await this.prisma.cart_items.findFirst({
      where: {
        cart_id: cart.id,
        product_id: BigInt(productId),
        variant_id: variantId ? BigInt(variantId) : null,
      },
    });

    if (existing) {
      await this.prisma.cart_items.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await this.prisma.cart_items.create({
        data: {
          cart_id: cart.id,
          product_id: BigInt(productId),
          variant_id: variantId ? BigInt(variantId) : null,
          quantity,
          price: product.price,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cart_items.findFirst({
      where: { id: BigInt(itemId), cart_id: cart.id },
    });
    if (!item) throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ');

    if (quantity === 0) {
      await this.prisma.cart_items.delete({ where: { id: item.id } });
    } else {
      await this.prisma.cart_items.update({
        where: { id: item.id },
        data: { quantity },
      });
    }
    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cart_items.findFirst({
      where: { id: BigInt(itemId), cart_id: cart.id },
    });
    if (!item) throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ');
    await this.prisma.cart_items.delete({ where: { id: item.id } });
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cart_items.deleteMany({ where: { cart_id: cart.id } });
    return this.getCart(userId);
  }
}
