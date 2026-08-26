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
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CurrentUser } from '../../auth/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getOrdersForUser(user, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      status,
    });
  }

  @Get(':id')
  @Roles('BUYER', 'SELLER', 'ADMIN')
  async getOrderById(
    @CurrentUser() user: { id: string; role: string },
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderByIdForUser(user, BigInt(id));
  }

  @Patch(':id/status')
  @Roles('SELLER', 'ADMIN')
  async updateStatus(
    @CurrentUser() user: { id: string; role: string },
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    if (!body?.status) {
      throw new BadRequestException('Thiếu trường status');
    }
    return this.ordersService.updateStatus(
      BigInt(id),
      body.status,
      user.id,
      user.role,
    );
  }
}