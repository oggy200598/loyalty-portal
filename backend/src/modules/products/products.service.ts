import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
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
            in: [
              'CONFIRMED',
              'PROCESSING',
              'SHIPPING',
              'DELIVERED',
              'COMPLETED',
            ],
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
   * Lấy coupon đang hoạt động theo danh mục.
   *
   * Category
   *   ↓
   * coupon_categories
   *   ↓
   * coupons
   */
  private async getCouponsByCategoryIds(categoryIds: bigint[]) {
    if (categoryIds.length === 0) {
      return new Map<string, any[]>();
    }

    const rows = await this.prisma.$queryRaw<
      {
        coupon_id: bigint;
        category_id: bigint;
        code: string;
        name: string;
        discount_type: string;
        discount_value: Prisma.Decimal | number;
        min_order_value: Prisma.Decimal | number;
        max_discount: Prisma.Decimal | number | null;
        start_at: Date;
        end_at: Date;
        status: string;
      }[]
    >`
      SELECT
        c.id AS coupon_id,
        cc.category_id,
        c.code,
        c.name,
        c.discount_type,
        c.discount_value,
        c.min_order_value,
        c.max_discount,
        c.start_at,
        c.end_at,
        c.status
      FROM coupons c
      INNER JOIN coupon_categories cc
        ON cc.coupon_id = c.id
      WHERE cc.category_id IN (${Prisma.join(categoryIds)})
        AND c.status = 'ACTIVE'
        AND c.start_at <= NOW()
        AND c.end_at >= NOW()
        AND (
          c.usage_limit IS NULL
          OR c.used_count < c.usage_limit
        )
      ORDER BY c.discount_value DESC, c.id ASC;
    `;

    const result = new Map<string, any[]>();

    for (const row of rows) {
      const categoryKey = row.category_id.toString();

      if (!result.has(categoryKey)) {
        result.set(categoryKey, []);
      }

      result.get(categoryKey)!.push({
        id: row.coupon_id.toString(),
        code: row.code,
        name: row.name,
        discountType: row.discount_type,
        discountValue: Number(row.discount_value),
        minOrderValue: Number(row.min_order_value),
        maxDiscount:
          row.max_discount === null
            ? null
            : Number(row.max_discount),
        startAt: row.start_at,
        endAt: row.end_at,
        status: row.status,
      });
    }

    return result;
  }

  /**
   * Chuẩn hóa dữ liệu sản phẩm cho frontend.
   */
  private formatProduct(
    product: any,
    soldQuantity = 0,
    coupons: any[] = [],
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

      variants: product.product_variants.map(
        (variant: any) => ({
          id: variant.id,
          variantName: variant.variant_name,
          price: variant.price,
          stockQuantity: variant.stock_quantity,
        }),
      ),

      coupons,
    };
  }

  /**
   * Lấy danh sách sản phẩm.
   *
   * Logic:
   * 1. Lấy tất cả sản phẩm ACTIVE.
   * 2. Tính số lượng đã bán.
   * 3. Tính điểm:
   *    - Bán chạy: 60%
   *    - Mới: 25%
   *    - Random: 15%
   * 4. Chọn sản phẩm.
   * 5. Lấy coupon theo category.
   */
  async findAll(limit = 36) {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      50,
    );

    const products =
      await this.prisma.products.findMany({
        where: {
          status: 'ACTIVE',
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

    /**
     * Tính sold quantity.
     */
    const soldMap =
      await this.getSoldQuantityMap(
        products.map(
          (product) => product.id,
        ),
      );

    /**
     * Chấm điểm sản phẩm.
     */
    const scoredProducts = products.map(
      (product) => {
        const soldQuantity =
          soldMap.get(
            product.id.toString(),
          ) ?? 0;

        const ageDays =
          (Date.now() -
            product.created_at.getTime()) /
          (1000 * 60 * 60 * 24);

        const salesScore =
          Math.min(
            soldQuantity / 1000,
            1,
          ) * 60;

        const freshnessScore =
          Math.max(
            0,
            1 - ageDays / 30,
          ) * 25;

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
      },
    );

    scoredProducts.sort(
      (a, b) => b.score - a.score,
    );

    const selectedProducts =
      scoredProducts.slice(
        0,
        safeLimit,
      );

    /**
     * Lấy category IDs.
     */
    const categoryIds = [
      ...new Set(
        selectedProducts
          .map(
            ({ product }) =>
              product.category_id,
          )
          .filter(
            (
              id,
            ): id is bigint =>
              id !== null,
          ),
      ),
    ];

    /**
     * Lấy coupon theo category.
     */
    const couponMap =
      await this.getCouponsByCategoryIds(
        categoryIds,
      );

    /**
     * Format response.
     */
    return selectedProducts.map(
      ({
        product,
        soldQuantity,
      }) =>
        this.formatProduct(
          product,
          soldQuantity,
          couponMap.get(
            product.category_id?.toString() ??
              '',
          ) ?? [],
        ),
    );
  }

  /**
   * Lấy chi tiết một sản phẩm.
   */
  async findOne(id: number) {
    const product =
      await this.prisma.products.findUnique({
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
      });

    if (!product) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm có id=${id}`,
      );
    }

    const soldMap =
      await this.getSoldQuantityMap([
        product.id,
      ]);

    const couponMap =
      await this.getCouponsByCategoryIds(
        product.category_id
          ? [product.category_id]
          : [],
      );

    return this.formatProduct(
      product,
      soldMap.get(
        product.id.toString(),
      ) ?? 0,
      couponMap.get(
        product.category_id?.toString() ??
          '',
      ) ?? [],
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
  async findProductsByCategory(
    categoryId: number,
  ) {
    const products =
      await this.prisma.products.findMany({
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

    const soldMap =
      await this.getSoldQuantityMap(
        products.map(
          (product) => product.id,
        ),
      );

    const couponMap =
      await this.getCouponsByCategoryIds([
        BigInt(categoryId),
      ]);

    return products.map(
      (product) =>
        this.formatProduct(
          product,
          soldMap.get(
            product.id.toString(),
          ) ?? 0,
          couponMap.get(
            product.category_id?.toString() ??
              '',
          ) ?? [],
        ),
    );
  }

  /**
   * Lấy danh sách shop đang hoạt động kèm số sản phẩm.
   */
  async findShops() {
    const shops = await this.prisma.shops.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        status: true,
        _count: {
          select: {
            products: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    return shops.map((shop) => ({
      id: shop.id.toString(),
      name: shop.name,
      description: shop.description,
      logoUrl: shop.logo_url,
      status: shop.status,
      productCount: shop._count.products,
    }));
  }

  /**
   * Chi tiết một shop.
   */
  async findShopById(shopId: number) {
    const shop = await this.prisma.shops.findUnique({
      where: { id: BigInt(shopId) },
      select: {
        id: true,
        name: true,
        description: true,
        logo_url: true,
        status: true,
        created_at: true,
        _count: {
          select: {
            products: {
              where: { status: 'ACTIVE' },
            },
            orders: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException(
        `Không tìm thấy shop #${shopId}`,
      );
    }

    return {
      id: shop.id.toString(),
      name: shop.name,
      description: shop.description,
      logoUrl: shop.logo_url,
      status: shop.status,
      createdAt: shop.created_at,
      productCount: shop._count.products,
      orderCount: shop._count.orders,
    };
  }

  /**
   * Sản phẩm thuộc một shop.
   */
  async findProductsByShop(shopId: number) {
    const products =
      await this.prisma.products.findMany({
        where: {
          shop_id: BigInt(shopId),
          status: 'ACTIVE',
        },
        orderBy: { created_at: 'desc' },
        include: {
          shops: {
            select: { id: true, name: true, logo_url: true },
          },
          categories: {
            select: {
              id: true,
              name: true,
              parent_id: true,
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
            orderBy: { id: 'asc' },
          },
        },
      });

    const soldMap = await this.getSoldQuantityMap(
      products.map((product) => product.id),
    );

    const categoryIds = [
      ...new Set(
        products
          .map((product) => product.category_id)
          .filter(
            (id): id is bigint => id !== null,
          ),
      ),
    ];

    const couponMap =
      await this.getCouponsByCategoryIds(categoryIds);

    return products.map((product) =>
      this.formatProduct(
        product,
        soldMap.get(product.id.toString()) ?? 0,
        couponMap.get(
          product.category_id?.toString() ?? '',
        ) ?? [],
      ),
    );
  }

  /**
   * Flash Sale — lấy sản phẩm ngẫu nhiên và gán discount giả lập.
   * Trả về sản phẩm kèm originalPrice, salePrice, discountPercent, progressPercent.
   */
  async findFlashSaleProducts(limit = 12) {
    const products = await this.prisma.products.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
      take: limit * 3, // lấy nhiều hơn để random
      include: {
        shops: { select: { id: true, name: true, logo_url: true } },
        categories: { select: { id: true, name: true } },
        product_images: {
          select: { image_url: true, is_primary: true },
        },
      },
    });

    // Random pick và gán discount
    const shuffled = products.sort(() => 0.5 - Math.random()).slice(0, limit);

    const soldMap = await this.getSoldQuantityMap(
      shuffled.map((p) => p.id),
    );

    const categoryIds = [
      ...new Set(
        shuffled
          .map((p) => p.category_id)
          .filter((id): id is bigint => id !== null),
      ),
    ];

    const couponMap = await this.getCouponsByCategoryIds(categoryIds);

    return shuffled.map((product) => {
      const formatted = this.formatProduct(
        product,
        soldMap.get(product.id.toString()) ?? 0,
        couponMap.get(product.category_id?.toString() ?? '') ?? [],
      );

      const originalPrice = Number(product.price ?? 0);
      // Random discount 10-50%
      const discountPercent = 10 + Math.floor(Math.random() * 41);
      const salePrice = Math.round(
        originalPrice * (1 - discountPercent / 100),
      );

      const totalStock = product.stock_quantity ?? 0;
      const soldInSale = Math.round(
        totalStock * (0.2 + (Math.random() * 0.5)),
      );

      return {
        ...formatted,
        originalPrice,
        salePrice,
        discountPercent,
        totalStock,
        soldInSale,
        progressPercent: Math.min(
          100,
          Math.round((soldInSale / (totalStock || 1)) * 100),
        ),
        outOfStock: soldInSale >= totalStock,
      };
    });
  }
}