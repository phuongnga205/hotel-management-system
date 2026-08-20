import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class AdminUpdateUserDto {
    @ApiPropertyOptional({
        example: 'john.doe',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    username?: string;

    @ApiPropertyOptional({
        example: 'john@example.com',
        maxLength: 255,
    })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({
        example: '0912345678',
        maxLength: 20,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    @Matches(/^(0|\+84)\d{9,10}$/)
    phone?: string;

    @ApiPropertyOptional({
        enum: UserRole,
        example: UserRole.USER,
    })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({
        enum: UserStatus,
        example: UserStatus.ACTIVE,
    })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}