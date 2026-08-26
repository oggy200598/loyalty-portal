import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { serialize } from '../../common/serialize';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Buyer đánh giá sản phẩm theo đơn hàng (đã giao) */
  async createReview(
    buyerId: string,
    dto: { orderId: string; productId: string; rating: number; comment?: string },
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: BigInt(dto.orderId) },
      select: { id: true, buyer_id: true, status: true },
    });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    if (order.buyer_id !== buyerId) {
      throw new BadRequestException('Bạn chỉ được đánh giá đơn hàng của mình');
    }
    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new BadRequestException('Chỉ được đánh giá đơn đã giao/hoàn thành');
    }

    const review = await this.prisma.reviews.create({
      data: {
        order_id: BigInt(dto.orderId),
        product_id: BigInt(dto.productId),
        buyer_id: buyerId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
    return serialize(review);
  }

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const where = { product_id: BigInt(productId) };
    const [total, reviews] = await Promise.all([
      this.prisma.reviews.count({ where }),
      this.prisma.reviews.findMany({
        where,
        orderBy: { created_at: 'desc' },
        include: {
          users: { select: { id: true, full_name: true, avatar_url: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;
    return serialize({
      data: reviews,
      averageRating: Math.round(avg * 10) / 10,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
}
