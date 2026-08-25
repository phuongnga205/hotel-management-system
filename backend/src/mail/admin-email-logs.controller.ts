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
  ApiAcceptedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MailService } from './mail.service';
import { ListEmailLogsDto } from './dto/list-email-logs.dto';
import { EmailLogIdParamDto } from './dto/email-log-id-param.dto';
import { EmailLogListResponseDto } from './dto/email-log-list-response.dto';
import {
  EmailLogDetailResponseDto,
  RetryEmailLogResponseDto,
} from './dto/email-log-detail-response.dto';

@ApiTags('Admin Email Logs')
@Controller('admin/email-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required' })
@ApiForbiddenResponse({ description: 'Administrator role is required' })
export class AdminEmailLogsController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  @ApiOperation({ summary: 'List email delivery logs' })
  @ApiOkResponse({
    description: 'Returns a paginated list of email logs',
    type: EmailLogListResponseDto,
  })
  async getEmailLogs(
    @Query() query: ListEmailLogsDto,
  ): Promise<EmailLogListResponseDto> {
    return this.mailService.getEmailLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an email log by ID' })
  @ApiOkResponse({
    description: 'Returns email delivery details',
    type: EmailLogDetailResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Email log not found' })
  async getEmailLog(
    @Param() params: EmailLogIdParamDto,
  ): Promise<EmailLogDetailResponseDto> {
    return this.mailService.getEmailLog(params.id);
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Retry a failed email' })
  @ApiAcceptedResponse({
    description: 'Email retry accepted',
    type: RetryEmailLogResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Email log not found' })
  @ApiConflictResponse({
    description: 'Email log is not in FAILED status',
  })
  async retryEmailLog(
    @Param() params: EmailLogIdParamDto,
  ): Promise<RetryEmailLogResponseDto> {
    return this.mailService.retryEmailLog(params.id);
  }
}
