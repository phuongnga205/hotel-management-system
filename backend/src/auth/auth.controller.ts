/* sunlint-disable */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
  Header,
  Res,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetRawToken } from './decorators/get-token.decorator';

const CLEAR_SITE_DATA_HEADER = 'Clear-Site-Data';
const CLEAR_SITE_DATA_VALUE = '"cache", "cookies", "storage"';

const CACHE_CONTROL_HEADER = 'Cache-Control';
const CACHE_CONTROL_VALUE =
  'no-store, no-cache, must-revalidate, proxy-revalidate';
const PRAGMA_HEADER = 'Pragma';
const PRAGMA_VALUE = 'no-cache';
const EXPIRES_HEADER = 'Expires';
const EXPIRES_VALUE = '0';
const SURROGATE_CONTROL_HEADER = 'Surrogate-Control';
const SURROGATE_CONTROL_VALUE = 'no-store';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Header('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  @ApiOperation({ summary: 'Đăng ký tài khoản người dùng mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về Access Token',
  })
  @ApiResponse({ status: 401, description: 'Thông tin đăng nhập không hợp lệ' })
  async signInAction(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set(CACHE_CONTROL_HEADER, CACHE_CONTROL_VALUE);
    res.set(PRAGMA_HEADER, PRAGMA_VALUE);
    res.set(EXPIRES_HEADER, EXPIRES_VALUE);
    res.set(SURROGATE_CONTROL_HEADER, SURROGATE_CONTROL_VALUE);
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thu hồi Token' })
  @ApiResponse({ status: 200, description: 'Thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ' })
  async signOutAction(
    @GetRawToken() token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.set(CACHE_CONTROL_HEADER, CACHE_CONTROL_VALUE);
    res.set(PRAGMA_HEADER, PRAGMA_VALUE);
    res.set(EXPIRES_HEADER, EXPIRES_VALUE);
    res.set(SURROGATE_CONTROL_HEADER, SURROGATE_CONTROL_VALUE);
    res.set(CLEAR_SITE_DATA_HEADER, CLEAR_SITE_DATA_VALUE);

    return this.authService.logout(token);
  }
}
