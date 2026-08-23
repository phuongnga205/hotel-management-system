import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetRawToken } from '../auth/decorators/get-token.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AvatarFileValidationPipe } from './pipes/avatar-file-validation.pipe';

@ApiTags('Users - Profile')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin profile của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Trả về thông tin profile' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  findMe(@GetUser('id') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Cập nhật profile của người dùng hiện tại',
    description: 'Cho phép cập nhật fullName, phone, email, username',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({
    status: 409,
    description: 'Email / username / phone đã tồn tại',
  })
  updateProfile(@GetUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi mật khẩu cho người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 400, description: 'Mật khẩu mới trùng mật khẩu cũ' })
  @ApiResponse({ status: 401, description: 'Mật khẩu hiện tại không đúng' })
  changePassword(
    @GetUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
    @GetRawToken() token: string,
  ) {
    return this.usersService.changePassword(userId, dto, token);
  }

  @Post('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Thêm/thay ảnh đại diện của người dùng hiện tại' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Cập nhật ảnh đại diện thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  uploadAvatar(
    @GetUser('id') userId: string,
    @UploadedFile(AvatarFileValidationPipe) file: Express.Multer.File,
  ) {
    return this.usersService.updateAvatar(userId, file);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xoá ảnh đại diện của người dùng hiện tại' })
  @ApiResponse({ status: 200, description: 'Xoá ảnh đại diện thành công' })
  @ApiResponse({ status: 401, description: 'Chưa xác thực' })
  @ApiResponse({ status: 404, description: 'Chưa có ảnh đại diện để xoá' })
  removeAvatar(@GetUser('id') userId: string) {
    return this.usersService.removeAvatar(userId);
  }
}
