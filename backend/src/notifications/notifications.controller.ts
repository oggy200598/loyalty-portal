import { PaginationDto } from '../common/pagination.dto';
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Sse,
  Header,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { CurrentUser } from '../auth/auth.decorators';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('stream')
  @Header('X-Accel-Buffering', 'no')
  stream(@CurrentUser() user: { id: string; sessionVersion: number }) {
    return this.notificationsService.stream(user.id, user.sessionVersion);
  }

  @Get()
  list(@CurrentUser() user: { id: string }, @Query() query: PaginationDto) {
    return this.notificationsService.list(user.id, query.page, query.limit);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllRead(user.id);
  }
}
