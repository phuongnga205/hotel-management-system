import { ApiProperty } from '@nestjs/swagger';
import { EmailLogResponseDto } from './email-log-response.dto';

export class EmailLogListDataDto {
  @ApiProperty({ type: [EmailLogResponseDto] })
  items!: EmailLogResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class EmailLogListResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Email logs retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: EmailLogListDataDto })
  data!: EmailLogListDataDto;
}
