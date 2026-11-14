import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import { MomoService } from './momo.service';
@Controller('payments/momo')
export class MomoController {
  constructor(private readonly momo: MomoService) {}
  @Get('availability') availability() {
    return this.momo.availability();
  }
  @Post('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER')
  create(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() user: { id: string },
  ) {
    return this.momo.create(id, user.id);
  }
  @Post('ipn') @HttpCode(204) async ipn(@Body() body: Record<string, unknown>) {
    await this.momo.ipn(body);
  }
  @Get('return') async returned(
    @Query() query: Record<string, unknown>,
    @Res() response: Response,
  ) {
    response.redirect(303, await this.momo.returnUrl(query));
  }
}
