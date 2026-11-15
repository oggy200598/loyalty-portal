import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser } from '../auth/auth.decorators';
import {
  UsersQueryDto,
  CategoriesQueryDto,
  CategoryDto,
  ProductDto,
  ProductsQueryDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateUserDto,
} from './admin.dto';
import { AdminManagementService } from './admin-management.service';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';

/**
 * ADMIN PORTAL API — toàn bộ endpoint chỉ dành cho ADMIN.
 * Seller/Buyer gọi bất kỳ endpoint nào ở đây đều bị 403 bởi RolesGuard.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly management: AdminManagementService,
  ) {}

  @Get('users/:id')
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.management.getUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.management.updateUser(id, actor.id, dto);
  }

  @Get('catalog-options')
  catalogOptions() {
    return this.management.catalogOptions();
  }

  @Get('products')
  listProducts(@Query() query: ProductsQueryDto) {
    return this.management.listProducts(query);
  }

  @Get('products/:id')
  getProduct(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.management.getProduct(id);
  }

  @Post('products')
  createProduct(@CurrentUser() actor: { id: string }, @Body() dto: ProductDto) {
    return this.management.createProduct(actor.id, dto);
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() actor: { id: string },
    @Body() dto: UpdateProductDto,
  ) {
    return this.management.updateProduct(id, actor.id, dto);
  }

  @Get('categories')
  listCategories(@Query() query: CategoriesQueryDto) {
    return this.management.listCategories(query);
  }

  @Post('categories')
  createCategory(
    @CurrentUser() actor: { id: string },
    @Body() dto: CategoryDto,
  ) {
    return this.management.createCategory(actor.id, dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() actor: { id: string },
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.management.updateCategory(id, actor.id, dto);
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  listUsers(@Query() query: UsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('sellers')
  listSellers() {
    return this.adminService.listSellers();
  }

  @Get('shops')
  listShops() {
    return this.adminService.listShops();
  }

  @Get('audit-logs')
  listAuditLogs(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 50;
    return this.adminService.listAuditLogs(
      Number.isFinite(parsed) ? Math.min(parsed, 200) : 50,
    );
  }

  @Get('models')
  listMlModels() {
    return this.adminService.listMlModels();
  }
}
