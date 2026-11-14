import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParseBigIntPipe } from '../common/parse-bigint.pipe';
import { AddressesService } from './addresses.service';
import { AddressDto, AddressVersionDto, UpdateAddressDto } from './address.dto';
@Controller('users/me/addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}
  @Get() list(@CurrentUser() user: { id: string }) {
    return this.addresses.list(user.id);
  }
  @Post() create(@CurrentUser() user: { id: string }, @Body() dto: AddressDto) {
    return this.addresses.save(user.id, dto);
  }
  @Patch(':id') update(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.save(user.id, dto, id);
  }
  @Delete(':id') remove(
    @CurrentUser() user: { id: string },
    @Param('id', ParseBigIntPipe) id: bigint,
    @Query() query: AddressVersionDto,
  ) {
    return this.addresses.remove(user.id, id, query.version);
  }
}
