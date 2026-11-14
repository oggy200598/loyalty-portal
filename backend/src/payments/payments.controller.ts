import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import { VnpayService } from './vnpay.service';
@Controller('payments/vnpay')
export class PaymentsController {
  constructor(private readonly vnpay: VnpayService) {}
  @Get('availability') availability() {
    return this.vnpay.availability();
  }
  @Post('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  create(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.vnpay.create(id, user.id, req.ip ?? '127.0.0.1');
  }
  @Get('ipn') ipn(@Query() query: Record<string, unknown>) {
    return this.vnpay.ipn(query);
  }
  @Get('return') async returned(
    @Query() query: Record<string, unknown>,
    @Res() response: Response,
  ) {
    response.redirect(303, await this.vnpay.returnUrl(query));
  }
}
