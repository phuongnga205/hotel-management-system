import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UserQueryDto {
  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Số trang (bắt đầu từ 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  page: number = 1;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Số bản ghi mỗi trang (tối đa 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('messages.VALIDATION.IS_INT') })
  @Min(1, { message: i18nValidationMessage('messages.VALIDATION.MIN') })
  @Max(100, { message: i18nValidationMessage('messages.VALIDATION.MAX') })
  limit: number = 10;

  @ApiPropertyOptional({
    example: 'nguyen',
    description: 'Tìm kiếm theo username, email hoặc họ tên',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
  search?: string;

  @ApiPropertyOptional({
    enum: UserStatus,
    description: 'Lọc theo trạng thái tài khoản',
  })
  @IsOptional()
  @IsEnum(UserStatus, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  status?: UserStatus;

  @ApiPropertyOptional({
    enum: UserRole,
    description: 'Lọc theo vai trò',
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: i18nValidationMessage('messages.VALIDATION.IS_ENUM'),
  })
  role?: UserRole;
}
