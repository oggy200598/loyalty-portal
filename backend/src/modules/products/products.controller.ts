import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // GET /products?limit=6
  @Get('products')
  findAll(
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 6;

    return this.productsService.findAll(
      Number.isFinite(parsedLimit) ? parsedLimit : 6,
    );
  }

  // GET /products/:id
  @Get('products/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  // GET /categories
  @Get('categories')
  findCategories() {
    return this.productsService.findCategories();
  }

  // GET /categories/:id/products
  @Get('categories/:id/products')
  findProductsByCategory(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findProductsByCategory(id);
  }

  // GET /shops
  @Get('shops')
  findShops() {
    return this.productsService.findShops();
  }

  // GET /shops/:id
  @Get('shops/:id')
  findShopById(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findShopById(id);
  }

  // GET /shops/:id/products
  @Get('shops/:id/products')
  findProductsByShop(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findProductsByShop(id);
  }

  // GET /products/flash-sale
  @Get('products/flash-sale')
  findFlashSaleProducts(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : 12;
    return this.productsService.findFlashSaleProducts(
      Number.isFinite(parsedLimit) ? parsedLimit : 12,
    );
  }
}