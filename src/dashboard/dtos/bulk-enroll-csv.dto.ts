import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO for bulk enrollment via CSV upload
 * Requirements: 8.7, 13.7
 */
export class BulkEnrollCsvDto {
  @ApiProperty({
    description: 'Course ID to enroll users in',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'CSV file containing user emails or IDs (one per line)',
    type: 'string',
    format: 'binary',
  })
  file: { buffer: Buffer; originalname: string; mimetype: string };
}

/**
 * DTO for bulk enrollment result
 * Requirements: 8.7, 13.7
 */
export class BulkEnrollCsvResultDto {
  @ApiProperty({
    description: 'Number of successful enrollments',
    example: 45,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed enrollments',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Total number of records processed',
    example: 50,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Details of failed enrollments',
    type: [Object],
    example: [
      { identifier: 'user@example.com', reason: 'User not found' },
      { identifier: 'another@example.com', reason: 'Already enrolled' },
    ],
  })
  failures: Array<{
    identifier: string;
    reason: string;
  }>;
}
