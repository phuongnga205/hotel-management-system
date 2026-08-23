import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MailOutboxPayloadDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsString()
  html?: string;
}
