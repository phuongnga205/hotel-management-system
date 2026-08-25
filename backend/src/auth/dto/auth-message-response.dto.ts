import { ApiProperty } from '@nestjs/swagger';

export class AuthMessageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Operation completed successfully.' })
  message!: string;

  @ApiProperty({ nullable: true, example: null })
  data!: null;
}
