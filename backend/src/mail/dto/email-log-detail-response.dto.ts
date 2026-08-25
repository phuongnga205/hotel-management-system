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

  // `type: () => Object` sidesteps a real @nestjs/swagger CLI-plugin bug:
  // with no explicit type hint, the plugin's type inference on a bare
  // `null`-typed property resolves to the *declaring class itself*,
  // producing a circular schema reference that crashes app boot
  // ("A circular dependency has been detected (property key: data)").
  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data!: null;
}
