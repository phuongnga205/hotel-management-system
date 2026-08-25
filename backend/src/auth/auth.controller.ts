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
import { ActivateAccountDto } from './dto/activate-account.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthMessageResponseDto } from './dto/auth-message-response.dto';
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
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Registration succeeded' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('activate')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate an account with a six-digit OTP' })
  @ApiResponse({ status: 200, type: AuthMessageResponseDto })
  @ApiResponse({ status: 400, description: 'OTP is invalid or expired' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  activate(@Body() dto: ActivateAccountDto) {
    return this.authService.activate(dto);
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password-reset OTP',
    description:
      'Always returns the same response to prevent account enumeration.',
  })
  @ApiResponse({ status: 200, type: AuthMessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password with a six-digit OTP' })
  @ApiResponse({ status: 200, type: AuthMessageResponseDto })
  @ApiResponse({ status: 400, description: 'OTP is invalid or expired' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in' })
  @ApiResponse({
    status: 200,
    description: 'Sign-in succeeded and returns an access token',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Revoke the current token' })
  @ApiResponse({ status: 200, description: 'Token revoked' })
  @ApiResponse({ status: 401, description: 'Invalid token' })
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
