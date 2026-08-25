import { ApiProperty } from '@nestjs/swagger';
import { EmailLogResponseDto } from './email-log-response.dto';

export class EmailLogDetailResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Email log retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: EmailLogResponseDto })
  data!: EmailLogResponseDto;
}

export class RetryEmailLogResponseDto {
  @ApiProperty({ example: 202 })
  statusCode!: number;

  @ApiProperty({ example: 'Email retry accepted.' })
  message!: string;

  @ApiProperty({ nullable: true, example: null })
  data!: null;
}
