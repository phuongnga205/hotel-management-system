import {
    IsEmail,
    IsOptional,
    IsString,
    IsUrl,
    Length,
    Matches,
    MaxLength,
} from 'class-validator';
import { UserRole, UserStatus } from '../entities/user.entity';

export class CreateUserDto {
    @IsString()
    @Length(3, 100)
    username!: string;

    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10,11}$/, {
        message: 'Phone number must contain 10-11 digits',
    })
    phone!: string;

    @IsEmail()
    @MaxLength(255)
    email!: string;

    @IsString()
    @Length(8, 255)
    password!: string;

    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    avatarUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    role?: UserRole;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    status?: UserStatus;
}