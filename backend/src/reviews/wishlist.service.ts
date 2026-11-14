import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { serialize } from '../common/serialize';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlists.findFirst({
      where: { user_id: userId },
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlists.create({
        data: { user_id: userId },
      });
    }
    return wishlist;
  }

  async getWishlist(userId: string) {
    const wishlist = await this.prisma.wishlists.findFirst({
      where: { user_id: userId },
      include: {
        wishlist_items: {
          include: {
            products: {
              select: { id: true, name: true, price: true, status: true },
            },
          },
        },
      },
    });
    if (!wishlist) return serialize({ items: [] });
    return serialize(wishlist);
  }

  async addProduct(userId: string, productId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: BigInt(productId) },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlist_items.upsert({
      where: {
        wishlist_id_product_id: {
          wishlist_id: wishlist.id,
          product_id: BigInt(productId),
        },
      },
      create: { wishlist_id: wishlist.id, product_id: BigInt(productId) },
      update: {},
    });
    return this.getWishlist(userId);
  }

  async removeProduct(userId: string, productId: string) {
    const wishlist = await this.prisma.wishlists.findFirst({
      where: { user_id: userId },
    });
    if (!wishlist) throw new NotFoundException('Wishlist không tồn tại');
    await this.prisma.wishlist_items.delete({
      where: {
        wishlist_id_product_id: {
          wishlist_id: wishlist.id,
          product_id: BigInt(productId),
        },
      },
    });
    return this.getWishlist(userId);
  }
}
