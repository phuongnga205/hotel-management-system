import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EmailLogIdParamDto } from './dto/email-log-id-param.dto';
import { EmailLogResponseDto } from './dto/email-log-response.dto';
import { SendMailDto } from './dto/send-mail.dto';
import { MailService } from './mail.service';

@ApiTags('mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @ApiOperation({
    summary: 'Queue a test email (verifies Redis/BullMQ/Nodemailer wiring)',
  })
  @ApiCreatedResponse({ type: EmailLogResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  sendTest(@Body() dto: SendMailDto) {
    return this.mailService.queueMail(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Check delivery status of a queued email (status, retryCount, lastError)',
  })
  @ApiOkResponse({ type: EmailLogResponseDto })
  @ApiBadRequestResponse({ description: 'id is not a numeric string' })
  @ApiNotFoundResponse({ description: 'Email log not found' })
  getStatus(@Param() params: EmailLogIdParamDto) {
    return this.mailService.getEmailLog(params.id);
  }
}
