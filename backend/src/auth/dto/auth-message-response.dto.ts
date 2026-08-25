import { ApiProperty } from '@nestjs/swagger';

export class AuthMessageResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Operation completed successfully.' })
  message!: string;

  // `type: () => Object` sidesteps a real @nestjs/swagger CLI-plugin bug:
  // with no explicit type hint, the plugin's type inference on a bare
  // `null`-typed property resolves to the *declaring class itself*,
  // producing a circular schema reference that crashes app boot
  // ("A circular dependency has been detected (property key: data)").
  @ApiProperty({ type: () => Object, nullable: true, example: null })
  data!: null;
}
