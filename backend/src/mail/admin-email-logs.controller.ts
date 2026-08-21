import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MailService } from './mail.service';
import { ListEmailLogsDto } from './dto/list-email-logs.dto';
import { EmailLogIdParamDto } from './dto/email-log-id-param.dto';
import { EmailLogResponseDto } from './dto/email-log-response.dto';

@ApiTags('Admin Email Logs')
@Controller('admin/email-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('access-token')
export class AdminEmailLogsController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lịch sử gửi email' })
  @ApiResponse({ status: 200, description: 'Trả về danh sách email logs' })
  async getEmailLogs(@Query() query: ListEmailLogsDto) {
    return this.mailService.getEmailLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một email log' })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin chi tiết email',
    type: EmailLogResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy email log' })
  async getEmailLog(@Param() params: EmailLogIdParamDto) {
    return this.mailService.getEmailLog(params.id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Thử gửi lại một email bị lỗi' })
  @ApiResponse({
    status: 202,
    description: 'Đã đẩy lại job vào queue thành công',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy email log' })
  @ApiResponse({
    status: 400,
    description: 'Chỉ có thể retry email FAILED hoặc Không tìm thấy Job',
  })
  async retryEmailLog(@Param() params: EmailLogIdParamDto) {
    await this.mailService.retryEmailLog(params.id);
    return { message: 'Đã đẩy yêu cầu gửi lại email vào hàng đợi.' };
  }
}
