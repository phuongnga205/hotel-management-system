import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class UpdateUserDto {
    @ApiProperty({ example: 'nguyen@gmail.com', description: 'Email' })
    @IsEmail(
        {},
        { message: i18nValidationMessage('messages.VALIDATION.IS_EMAIL') },
    )
    @IsOptional()
    @MaxLength(255)
    email?: string;

    @ApiProperty({ example: 'nguyen_van_a', description: 'Tên đăng nhập' })
    @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
    @IsOptional()
    @MaxLength(50)
    username?: string;

    @ApiPropertyOptional({ example: '0987654321', description: 'Số điện thoại' })
    @IsOptional()
    @MaxLength(20)
    @Matches(/^(0|\+84)\d{9,10}$/)
    @IsString({ message: i18nValidationMessage('messages.VALIDATION.IS_STRING') })
    phone?: string;
}
