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
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({
        description: 'The username of the user',
        example: 'john_doe',
    })
    @IsString()
    @Length(3, 100)
    username!: string;

    @ApiProperty({
        description: 'The full name of the user',
        example: 'John Doe',
    })
    @IsString()
    @Length(3, 255)
    fullName!: string;

    @ApiProperty({
        description: 'The phone number of the user',
        example: '1234567890',
    })
    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10,11}$/, {
        message: 'Phone number must contain 10-11 digits',
    })
    phone!: string;

    @ApiProperty({
        description: 'The email address of the user',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    @MaxLength(255)
    email!: string;

    @ApiProperty({
        description: 'The password of the user',
        example: 'P@ssw0rd!',
    })
    @IsString()
    @Length(8, 255)
    password!: string;

    @ApiProperty({
        description: 'The URL of the user\'s avatar',
        example: 'https://example.com/avatar.jpg',
    })
    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    avatarUrl?: string;

    @ApiProperty({
        description: 'The role of the user',
        example: 'USER',
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    role?: UserRole;

    @ApiProperty({
        description: 'The status of the user',
        example: 'ACTIVE',
    })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    status?: UserStatus;
}