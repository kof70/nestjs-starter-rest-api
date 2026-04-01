import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { ProgressStatusFilter } from './filtered-learners.dto';

/**
 * DTO for bulk email request
 * Requirements: 14.8
 */
export class BulkEmailDto {
  @ApiProperty({ description: 'Email subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Email content (HTML supported)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    enum: ProgressStatusFilter,
    required: false,
    description: 'Filter recipients by progress status (optional)',
  })
  @IsOptional()
  @IsEnum(ProgressStatusFilter)
  filterByStatus?: ProgressStatusFilter;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Specific user IDs to send to (optional, overrides filter)',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  recipientUserIds?: string[];
}

/**
 * Response DTO for bulk email operation
 * Requirements: 14.8
 */
export class BulkEmailResponseDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Number of recipients' })
  recipientCount: number;

  @ApiProperty({ description: 'Email subject' })
  subject: string;

  @ApiProperty({ description: 'Status message' })
  message: string;

  @ApiProperty({ description: 'Job queued timestamp' })
  queuedAt: Date;
}
