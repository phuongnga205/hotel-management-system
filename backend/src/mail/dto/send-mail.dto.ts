import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EmailType } from '../entities/email-log.entity';
import {
  EMAIL_HTML_MAX_LENGTH,
  EMAIL_RECIPIENT_MAX_LENGTH,
  EMAIL_SUBJECT_MAX_LENGTH,
  EMAIL_TEXT_MAX_LENGTH,
} from '../mail.constants';

export class SendMailDto {
  @ApiProperty({ example: 'guest@example.com' })
  @IsEmail()
  @MaxLength(EMAIL_RECIPIENT_MAX_LENGTH)
  to!: string;

  @ApiProperty({
    description: 'Kind of email, logged in email_logs.type',
    enum: EmailType,
    example: EmailType.ACCOUNT_ACTIVATION,
  })
  @IsEnum(EmailType)
  type!: EmailType;

  @ApiProperty({ example: 'Booking confirmation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EMAIL_SUBJECT_MAX_LENGTH)
  subject!: string;

  @ApiProperty({ example: 'Your booking has been confirmed.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(EMAIL_TEXT_MAX_LENGTH)
  text!: string;

  @ApiPropertyOptional({ example: '<p>Your booking has been confirmed.</p>' })
  @IsOptional()
  @IsString()
  @MaxLength(EMAIL_HTML_MAX_LENGTH)
  html?: string;
}
