import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /** Lấy hoặc tạo cart cho user */
  private async getOrCreateCart(userId: string) {
    return this.prisma.carts.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });
  }

  async getCart(userId: string) {
    const cart = await this.prisma.carts.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            product_variants: true,
            products: {
              select: {
                id: true,
                name: true,
                price: true,
                stock_quantity: true,
              },
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

  async addItem(
    userId: string,
    productId: number,
    variantId: number | undefined,
    quantity: number,
  ) {
    const product = await this.prisma.products.findUnique({
      where: { id: BigInt(productId) },
      include: { product_variants: true, shops: true },
    });
    if (
      !product ||
      product.status !== 'ACTIVE' ||
      product.shops.status !== 'ACTIVE'
    )
      throw new NotFoundException('Không tìm thấy sản phẩm');
    const variant = variantId
      ? product.product_variants.find((v) => v.id === BigInt(variantId))
      : null;
    if (
      (variantId && !variant) ||
      (product.product_variants.length && !variant)
    )
      throw new BadRequestException('Biến thể không hợp lệ');
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity >
        Math.min(
          product.stock_quantity,
          variant?.stock_quantity ?? product.stock_quantity,
        )
    )
      throw new BadRequestException('Số lượng vượt tồn kho');

    const cart = await this.getOrCreateCart(userId);

    // Nếu đã có item cùng product/variant thì cộng dồn số lượng
    const existing = await this.prisma.cart_items.findFirst({
      where: {
        cart_id: cart.id,
        product_id: BigInt(productId),
        variant_id: variantId ? BigInt(variantId) : null,
      },
    });

    if (
      existing &&
      existing.quantity + quantity >
        Math.min(
          product.stock_quantity,
          variant?.stock_quantity ?? product.stock_quantity,
        )
    )
      throw new BadRequestException('Số lượng vượt tồn kho');
    if (existing) {
      await this.prisma.cart_items.update({
        where: { id: existing.id },
        data: {
          quantity: { increment: quantity },
          price: variant?.price ?? product.price,
        },
      });
    } else {
      await this.prisma.cart_items.create({
        data: {
          cart_id: cart.id,
          product_id: BigInt(productId),
          variant_id: variantId ? BigInt(variantId) : null,
          quantity,
          price: variant?.price ?? product.price,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: number, quantity: number) {
    if (!Number.isSafeInteger(quantity) || quantity < 0)
      throw new BadRequestException('Số lượng không hợp lệ');
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cart_items.findFirst({
      where: { id: BigInt(itemId), cart_id: cart.id },
      include: { products: true, product_variants: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ');

    if (
      quantity >
      Math.min(
        item.products.stock_quantity,
        item.product_variants?.stock_quantity ?? item.products.stock_quantity,
      )
    )
      throw new BadRequestException('Số lượng vượt tồn kho');
    if (quantity === 0) {
      await this.prisma.cart_items.delete({ where: { id: item.id } });
    } else {
      await this.prisma.cart_items.update({
        where: { id: item.id },
        data: {
          quantity,
          price: item.product_variants?.price ?? item.products.price,
        },
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
