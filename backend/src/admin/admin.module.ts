import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminManagementService } from './admin-management.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, SettingsController],
  providers: [AdminService, AdminManagementService, SettingsService],
})
export class AdminModule {}
