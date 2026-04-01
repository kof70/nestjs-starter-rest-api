import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsArray, ArrayMinSize } from 'class-validator';

export class BulkEnrollDto {
  @ApiProperty({
    description: 'Course ID to enroll users in',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  courseId: string;

  @ApiProperty({
    description: 'Array of user IDs to enroll',
    example: ['user-1', 'user-2', 'user-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class BulkEnrollResultDto {
  @ApiProperty({
    description: 'Number of successful enrollments',
    example: 5,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed enrollments',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Details of failed enrollments',
    type: [Object],
  })
  failures: Array<{
    userId: string;
    reason: string;
  }>;
}
