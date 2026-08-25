import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EmailLogIdParamDto } from './dto/email-log-id-param.dto';
import { EmailLogDetailResponseDto } from './dto/email-log-detail-response.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('mail')
@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @ApiOperation({
    summary: 'Queue a test email (verifies Redis/BullMQ/Nodemailer wiring)',
  })
  @ApiCreatedResponse({ type: EmailLogDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  sendTest(@Body() dto: SendMailDto) {
    return this.mailService.queueMail(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Check delivery status of a queued email (status, retryCount, lastError)',
  })
  @ApiOkResponse({ type: EmailLogDetailResponseDto })
  @ApiBadRequestResponse({ description: 'id is not a numeric string' })
  @ApiNotFoundResponse({ description: 'Email log not found' })
  getStatus(@Param() params: EmailLogIdParamDto) {
    return this.mailService.getEmailLog(params.id);
  }
}
