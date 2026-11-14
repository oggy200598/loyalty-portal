import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import {
  CategoriesQueryDto,
  CategoryDto,
  ProductDto,
  ProductsQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateUserDto,
} from './admin-management.dto';

const productInclude = {
  shops: { select: { id: true, name: true, status: true } },
  categories: { select: { id: true, name: true } },
  product_images: { orderBy: { id: 'asc' as const } },
  product_variants: { orderBy: { id: 'asc' as const } },
} satisfies Prisma.productsInclude;
const userSelect = {
  id: true,
  email: true,
  full_name: true,
  phone: true,
  status: true,
  updated_at: true,
  user_roles: { select: { roles: { select: { name: true } } } },
} satisfies Prisma.usersSelect;
const json = (value: unknown) =>
  JSON.stringify(value, (_key, entry: unknown) =>
    typeof entry === 'bigint' ? entry.toString() : entry,
  );

@Injectable()
export class AdminManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private async lock(tx: Prisma.TransactionClient, resource: string) {
    const result = await tx.$queryRaw<{ result: number }[]>`
      DECLARE @result int;
      EXEC @result=sp_getapplock @Resource=${resource}, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=5000;
      SELECT @result AS result;`;
    if (!result.length || result[0].result < 0)
      throw new ConflictException(
        'Có thao tác khác đang xử lý. Vui lòng thử lại.',
      );
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actor: string,
    action: string,
    entity: string,
    id: bigint | null,
    before: unknown,
    after: unknown,
  ) {
    await tx.audit_logs.create({
      data: {
        user_id: actor,
        action,
        entity_type: entity,
        entity_id: id,
        old_data: before == null ? null : json(before),
        new_data: json(after),
      },
    });
  }
  private revision(actual: Date, expected: string) {
    if (actual.getTime() !== new Date(expected).getTime())
      throw new ConflictException(
        'Dữ liệu đã thay đổi. Hãy đóng biểu mẫu và mở lại trước khi lưu.',
      );
  }
  private id(value: string) {
    const result = BigInt(value);
    if (result > 9223372036854775807n)
      throw new BadRequestException('ID không hợp lệ');
    return result;
  }
  async getUser(id: string) {
    const user = await this.prisma.users.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }
  async updateUser(id: string, actor: string, dto: UpdateUserDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, 'admin_user_updates');
      await tx.$queryRaw`SELECT id FROM users WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id=${id}`;
      const before = await tx.users.findUnique({
        where: { id },
        select: userSelect,
      });
      if (!before) throw new NotFoundException('Không tìm thấy tài khoản');
      this.revision(before.updated_at, dto.expectedUpdatedAt);
      if (before.status === 'DELETED')
        throw new ConflictException('Tài khoản đã bị xóa không thể sửa');
      if (id === actor && dto.status !== 'ACTIVE')
        throw new BadRequestException(
          'Không thể tự khóa tài khoản đang đăng nhập',
        );
      const operator = await tx.users.findUnique({
        where: { id: actor },
        select: userSelect,
      });
      if (
        operator?.status !== 'ACTIVE' ||
        !operator.user_roles.some((r) => r.roles.name === 'ADMIN')
      )
        throw new ForbiddenException('Tài khoản quản trị không còn hoạt động');
      if (
        dto.status !== 'ACTIVE' &&
        before.user_roles.some((r) => r.roles.name === 'ADMIN')
      ) {
        const count = await tx.users.count({
          where: {
            status: 'ACTIVE',
            user_roles: { some: { roles: { name: 'ADMIN' } } },
          },
        });
        if (count <= 1)
          throw new ConflictException(
            'Phải giữ ít nhất một admin đang hoạt động',
          );
      }
      const after = await tx.users.update({
        where: { id },
        data: {
          full_name: dto.fullName,
          phone: dto.phone || null,
          status: dto.status,
          updated_at: new Date(),
        },
        select: userSelect,
      });
      await this.audit(tx, actor, 'USER_UPDATED', 'USER', null, before, after);
      return after;
    });
  }
  async catalogOptions() {
    const [shops, categories] = await Promise.all([
      this.prisma.shops.findMany({
        select: { id: true, name: true, status: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.categories.findMany({
        select: { id: true, name: true, status: true, parent_id: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { shops, categories };
  }
  async listProducts(query: ProductsQueryDto) {
    const where: Prisma.productsWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.products.count({ where }),
      this.prisma.products.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: productInclude,
      }),
    ]);
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async getProduct(id: bigint) {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }
  private async checkProductReferences(
    tx: Prisma.TransactionClient,
    dto: ProductDto,
    creating: boolean,
  ) {
    const shop = await tx.shops.findUnique({
      where: { id: this.id(dto.shopId) },
    });
    if (!shop || (creating && shop.status !== 'ACTIVE'))
      throw new BadRequestException(
        'Cửa hàng không hoạt động hoặc không tồn tại',
      );
    if (
      dto.categoryId &&
      !(await tx.categories.findUnique({
        where: { id: this.id(dto.categoryId) },
      }))
    )
      throw new BadRequestException('Danh mục không tồn tại');
  }
  async createProduct(actor: string, dto: ProductDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.checkProductReferences(tx, dto, true);
      const product = await tx.products.create({
        data: {
          shop_id: this.id(dto.shopId),
          category_id: dto.categoryId ? this.id(dto.categoryId) : null,
          name: dto.name,
          description: dto.description || null,
          price: dto.price,
          stock_quantity: dto.stockQuantity,
          status: dto.status,
          ...(dto.imageUrl
            ? {
                product_images: {
                  create: { image_url: dto.imageUrl, is_primary: true },
                },
              }
            : {}),
        },
        include: productInclude,
      });
      await this.audit(
        tx,
        actor,
        'PRODUCT_CREATED',
        'PRODUCT',
        product.id,
        null,
        product,
      );
      return product;
    });
  }
  async updateProduct(id: bigint, actor: string, dto: UpdateProductDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM products WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id=${id}`;
        const before = await tx.products.findUnique({
          where: { id },
          include: productInclude,
        });
        if (!before) throw new NotFoundException('Không tìm thấy sản phẩm');
        if (before.status === 'DELETED')
          throw new ConflictException('Sản phẩm đã xóa không thể sửa');
        this.revision(before.updated_at, dto.expectedUpdatedAt);
        if (before.stock_quantity !== dto.expectedStockQuantity)
          throw new ConflictException(
            'Tồn kho đã thay đổi. Hãy mở lại sản phẩm trước khi lưu.',
          );
        if (before.shop_id !== this.id(dto.shopId))
          throw new BadRequestException(
            'Không thể chuyển sản phẩm sang cửa hàng khác',
          );
        await this.checkProductReferences(tx, dto, false);
        const ids = new Set(dto.variants.map((v) => v.id));
        if (
          ids.size !== dto.variants.length ||
          ids.size !== before.product_variants.length ||
          before.product_variants.some((v) => !ids.has(String(v.id)))
        )
          throw new BadRequestException(
            'Danh sách phân loại không khớp sản phẩm',
          );
        if (
          dto.variants.length &&
          dto.variants.reduce((sum, v) => sum + v.stockQuantity, 0) !==
            dto.stockQuantity
        )
          throw new BadRequestException(
            'Tồn kho phải bằng tổng tồn các phân loại',
          );
        for (const variant of dto.variants) {
          const saved = before.product_variants.find(
            (v) => String(v.id) === variant.id,
          )!;
          if (saved.stock_quantity !== variant.expectedStockQuantity)
            throw new ConflictException('Tồn kho phân loại đã thay đổi');
          await tx.product_variants.update({
            where: { id: saved.id },
            data: {
              price: variant.price,
              stock_quantity: variant.stockQuantity,
            },
          });
        }
        const existingImage = before.product_images.find(
          (image) => image.is_primary,
        );
        if (existingImage && existingImage.image_url !== dto.imageUrl) {
          if (dto.imageUrl)
            await tx.product_images.update({
              where: { id: existingImage.id },
              data: { image_url: dto.imageUrl },
            });
          else
            await tx.product_images.delete({ where: { id: existingImage.id } });
        } else if (!existingImage && dto.imageUrl) {
          await tx.product_images.create({
            data: { product_id: id, image_url: dto.imageUrl, is_primary: true },
          });
        }
        const after = await tx.products.update({
          where: { id },
          data: {
            name: dto.name,
            description: dto.description || null,
            category_id: dto.categoryId ? this.id(dto.categoryId) : null,
            price: dto.price,
            stock_quantity: dto.stockQuantity,
            status: dto.status,
            updated_at: new Date(),
          },
          include: productInclude,
        });
        await this.audit(
          tx,
          actor,
          'PRODUCT_UPDATED',
          'PRODUCT',
          id,
          before,
          after,
        );
        return after;
      },
      { timeout: 15000 },
    );
  }
  async listCategories(query: CategoriesQueryDto) {
    const where: Prisma.categoriesWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { name: { contains: query.q } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.categories.count({ where }),
      this.prisma.categories.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          categories: { select: { id: true, name: true } },
          _count: { select: { products: true } },
        },
      }),
    ]);
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  private async categoryData(
    tx: Prisma.TransactionClient,
    dto: CategoryDto,
    id?: bigint,
  ) {
    const parentId = dto.parentId ? this.id(dto.parentId) : null;
    const categories = await tx.categories.findMany({
      select: { id: true, parent_id: true, name: true },
    });
    if (parentId && !categories.some((row) => row.id === parentId))
      throw new BadRequestException('Danh mục cha không tồn tại');
    const visited = new Set<bigint>();
    let parent = parentId;
    while (parent !== null) {
      if (parent === id || visited.has(parent))
        throw new BadRequestException('Không thể tạo vòng lặp danh mục cha');
      visited.add(parent);
      parent = categories.find((row) => row.id === parent)?.parent_id ?? null;
    }
    const duplicate = await tx.categories.findFirst({
      where: {
        name: dto.name,
        parent_id: parentId,
        ...(id ? { id: { not: id } } : {}),
      },
    });
    if (duplicate)
      throw new ConflictException('Đã có danh mục cùng tên trong nhóm này');
    return {
      name: dto.name,
      description: dto.description || null,
      parent_id: parentId,
      status: dto.status,
    };
  }
  async createCategory(actor: string, dto: CategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, 'admin_category_tree');
      const after = await tx.categories.create({
        data: await this.categoryData(tx, dto),
      });
      await this.audit(
        tx,
        actor,
        'CATEGORY_CREATED',
        'CATEGORY',
        after.id,
        null,
        after,
      );
      return after;
    });
  }
  async updateCategory(id: bigint, actor: string, dto: UpdateCategoryDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, 'admin_category_tree');
      const before = await tx.categories.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy danh mục');
      if (
        before.name !== dto.originalName ||
        (before.description ?? '') !== dto.originalDescription ||
        String(before.parent_id ?? '') !== (dto.originalParentId ?? '') ||
        before.status !== dto.originalStatus
      )
        throw new ConflictException(
          'Danh mục đã thay đổi. Hãy mở lại trước khi lưu.',
        );
      const after = await tx.categories.update({
        where: { id },
        data: await this.categoryData(tx, dto, id),
      });
      await this.audit(
        tx,
        actor,
        'CATEGORY_UPDATED',
        'CATEGORY',
        id,
        before,
        after,
      );
      return after;
    });
  }
}
