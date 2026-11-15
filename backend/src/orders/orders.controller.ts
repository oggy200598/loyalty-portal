import { ConfirmCodPaymentDto } from '../loyalty/loyalty.dto';
import {
  CancelOwnOrderDto,
  OrdersQueryDto,
  OrderStatusDto,
  CreateOrderDto,
  QuoteOrderDto,
} from './orders.dto';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CheckoutService } from './checkout.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser } from '../auth/auth.decorators';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly checkout: CheckoutService,
  ) {}

  @Post('quote')
  @Roles('BUYER')
  quote(@Body() dto: QuoteOrderDto, @CurrentUser() user: { id: string }) {
    return this.checkout.quote(dto, user.id);
  }

  @Post()
  @Roles('BUYER')
  async create(
    @CurrentUser() user: { id: string },
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.placeOrder(user.id, createOrderDto);
  }

  @Get()
  @Roles('BUYER', 'SELLER', 'ADMIN')
  async getOrders(
    @CurrentUser() user: { id: string; role: string },
    @Query() query: OrdersQueryDto,
  ) {
    return this.ordersService.getOrdersForUser(user, query);
  }

  @Get(':id')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  async getOrderById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.ordersService.getOrderByIdForUser(user, id);
  }

  @Post(':id/confirm-cod-payment')
  @Roles('SELLER', 'ADMIN')
  confirmCodPayment(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: ConfirmCodPaymentDto,
  ) {
    return this.ordersService.confirmCodPayment(id, user, dto);
  }
  @Post(':id/cancel')
  @Roles('BUYER')
  cancelOwn(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: CancelOwnOrderDto,
  ) {
    return this.ordersService.updateStatus(
      id,
      'CANCELLED',
      user.id,
      user.role,
      dto.expectedStatus,
    );
  }

  @Patch(':id/status')
  @Roles('SELLER', 'ADMIN')
  async updateStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() body: OrderStatusDto,
  ) {
    if (!body?.status) {
      throw new BadRequestException('Thiếu trường status');
    }
    return this.ordersService.updateStatus(
      id,
      body.status,
      user.id,
      user.role,
      body.expectedStatus,
    );
  }
}
