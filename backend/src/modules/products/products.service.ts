import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính tổng số lượng đã bán của các sản phẩm.
   */
  private async getSoldQuantityMap(productIds: bigint[]) {
    if (productIds.length === 0) {
      return new Map<string, number>();
    }

    const sales = await this.prisma.order_items.groupBy({
      by: ['product_id'],
      _sum: {
        quantity: true,
      },
      where: {
        product_id: {
          in: productIds,
        },
        orders: {
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'COMPLETED'],
          },
        },
      },
    });

    return new Map(
      sales.map((item) => [
        item.product_id.toString(),
        Number(item._sum.quantity ?? 0),
      ]),
    );
  }

  /**
   * Chuẩn hóa dữ liệu sản phẩm cho frontend.
   */
  private formatProduct(
    product: any,
    soldQuantity = 0,
  ) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stockQuantity: product.stock_quantity,
      soldQuantity,
      status: product.status,
      createdAt: product.created_at,
      updatedAt: product.updated_at,

      shop: product.shops
        ? {
            id: product.shops.id,
            name: product.shops.name,
            logoUrl: product.shops.logo_url,
          }
        : null,

      category: product.categories
        ? {
            id: product.categories.id,
            parentId: product.categories.parent_id,
            name: product.categories.name,
            description: product.categories.description,
          }
        : null,

      images: product.product_images
        ? [
            {
              id: product.product_images.id,
              imageUrl: product.product_images.image_url,
              isPrimary: product.product_images.is_primary,
            },
          ]
        : [],

      variants: product.product_variants.map((variant: any) => ({
        id: variant.id,
        variantName: variant.variant_name,
        price: variant.price,
        stockQuantity: variant.stock_quantity,
      })),
    };
  }

  /**
   * Lấy danh sách sản phẩm thật từ PostgreSQL.
   */
  async findAll(limit = 6) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const products = await this.prisma.products.findMany({
      where: {
        status: 'ACTIVE',
      },

      orderBy: {
        created_at: 'desc',
      },

      take: safeLimit,

      include: {
        shops: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },

        categories: {
          select: {
            id: true,
            parent_id: true,
            name: true,
            description: true,
          },
        },

        product_images: {
          select: {
            id: true,
            image_url: true,
            is_primary: true,
          },
        },

        product_variants: {
          select: {
            id: true,
            variant_name: true,
            price: true,
            stock_quantity: true,
          },

          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    const soldMap = await this.getSoldQuantityMap(
    products.map((product) => product.id),
  );

  const scoredProducts = products.map((product) => {
    const soldQuantity =
      soldMap.get(product.id.toString()) ?? 0;

    const ageDays =
      (Date.now() - product.created_at.getTime()) /
      (1000 * 60 * 60 * 24);

    const salesScore =
      Math.min(soldQuantity / 1000, 1) * 60;

    const freshnessScore =
      Math.max(0, 1 - ageDays / 30) * 25;

    const randomScore =
      Math.random() * 15;

    return {
      product,
      soldQuantity,
      score:
        salesScore +
        freshnessScore +
        randomScore,
    };
  });

  scoredProducts.sort(
    (a, b) => b.score - a.score,
  );

  const selectedProducts =
    scoredProducts.slice(0, safeLimit);

  return selectedProducts.map(
    ({ product, soldQuantity }) =>
      this.formatProduct(
        product,
        soldQuantity,
      ),
  );
  }

  /**
   * Lấy chi tiết một sản phẩm.
   */
  async findOne(id: number) {
    const product = await this.prisma.products.findUnique({
      where: {
        id,
      },

      include: {
        shops: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            status: true,
          },
        },

        categories: {
          select: {
            id: true,
            parent_id: true,
            name: true,
            description: true,
            status: true,
          },
        },

        product_images: {
          select: {
            id: true,
            image_url: true,
            is_primary: true,
          },
        },

        product_variants: {
          select: {
            id: true,
            variant_name: true,
            price: true,
            stock_quantity: true,
          },

          orderBy: {
            id: 'asc',
          },
        },
      },
    }
  );

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm có id=${id}`,
      );
    }

    const soldMap = await this.getSoldQuantityMap([
      product.id,
    ]);

    return this.formatProduct(
      product,
      soldMap.get(product.id.toString()) ?? 0,
    );
  }

  /**
   * Lấy toàn bộ danh mục đang hoạt động.
   */
  async findCategories() {
    return this.prisma.categories.findMany({
      where: {
        status: 'ACTIVE',
      },

      orderBy: {
        name: 'asc',
      },

      select: {
        id: true,
        parent_id: true,
        name: true,
        description: true,
        status: true,
      },
    });
  }

  /**
   * Lấy sản phẩm thuộc một danh mục.
   */
  async findProductsByCategory(categoryId: number) {
    const products = await this.prisma.products.findMany({
      where: {
        category_id: categoryId,
        status: 'ACTIVE',
      },

      orderBy: {
        created_at: 'desc',
      },

      include: {
        shops: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },

        categories: {
          select: {
            id: true,
            name: true,
            parent_id: true,
          },
        },

        product_images: {
          select: {
            id: true,
            image_url: true,
            is_primary: true,
          },
        },

        product_variants: {
          select: {
            id: true,
            variant_name: true,
            price: true,
            stock_quantity: true,
          },

          orderBy: {
            id: 'asc',
          },
        },
      },
    });

    const soldMap = await this.getSoldQuantityMap(
      products.map((product) => product.id),
    );

    return products.map((product) =>
      this.formatProduct(
        product,
        soldMap.get(product.id.toString()) ?? 0,
      ),
    );
  }
}