import { ApiProperty } from '@nestjs/swagger';
import { EmailLog, EmailStatus, EmailType } from '../entities/email-log.entity';

export class EmailLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: Object.values(EmailType) })
  type!: EmailType;

  @ApiProperty()
  recipient!: string;

  @ApiProperty({ enum: Object.values(EmailStatus) })
  status!: EmailStatus;

  @ApiProperty()
  retryCount!: number;

  @ApiProperty({ type: String, nullable: true })
  lastError!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  sentAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromEntity(entity: EmailLog): EmailLogResponseDto {
    const dto = new EmailLogResponseDto();
    dto.id = entity.id;
    dto.type = entity.type;
    dto.recipient = entity.recipient;
    dto.status = entity.status;
    dto.retryCount = entity.retryCount;
    dto.lastError = entity.lastError ?? null;
    dto.sentAt = entity.sentAt ?? null;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
