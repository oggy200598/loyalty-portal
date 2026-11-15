import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser } from '../auth/auth.decorators';
import { CreateCouponDto, UpdateCouponDto } from './coupons.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  /** Danh sách mã giảm giá dùng chung, không bao gồm phiếu KHTT cá nhân. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER')
  list() {
    return this.couponsService.list();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCouponDto,
  ) {
    if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n)
      throw new BadRequestException('Mã định danh không hợp lệ.');
    return this.couponsService.update(BigInt(id), user.id, dto);
  }
}
