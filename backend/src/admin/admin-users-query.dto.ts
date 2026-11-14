import { IsIn, IsOptional } from 'class-validator';
import { AdminListDto } from './admin-management.dto';

export class UsersQueryDto extends AdminListDto {
  @IsOptional() @IsIn(['ACTIVE', 'SUSPENDED', 'DELETED']) status?: string;
}
