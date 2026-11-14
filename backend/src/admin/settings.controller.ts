import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsDto } from './settings.dto';
import { SettingsService } from './settings.service';
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}
  @Get('settings') get() {
    return this.settings.get();
  }
  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  save(@CurrentUser() user: { id: string }, @Body() dto: SettingsDto) {
    return this.settings.save(user.id, dto);
  }
}
