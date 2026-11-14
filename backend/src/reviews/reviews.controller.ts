import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { WishlistService } from './wishlist.service';
import { CreateReviewDto, AddWishlistDto } from './reviews.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly wishlistService: WishlistService,
  ) {}

  // ===== Reviews =====

  @Post('reviews')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  createReview(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user.id, dto);
  }

  @Get('products/:productId/reviews')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  getProductReviews(
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.getProductReviews(
      productId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ===== Wishlist =====

  @Get('wishlist')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  getWishlist(@CurrentUser() user: { id: string }) {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post('wishlist')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  addToWishlist(
    @CurrentUser() user: { id: string },
    @Body() dto: AddWishlistDto,
  ) {
    return this.wishlistService.addProduct(user.id, dto.productId);
  }

  @Delete('wishlist/:productId')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  removeFromWishlist(
    @CurrentUser() user: { id: string },
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeProduct(user.id, productId);
  }
}
