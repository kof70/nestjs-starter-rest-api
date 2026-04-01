import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus, Language } from '@prisma/client';

/**
 * Response DTO for enrolled courses in LMS
 * Requirements: 5.2, 5.10
 */
export class LmsEnrolledCourseResponseDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to NestJS',
  })
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the basics of NestJS framework',
  })
  description: string;

  @ApiProperty({
    description: 'Course language',
    enum: Language,
    example: Language.EN,
  })
  language: Language;

  @ApiPropertyOptional({
    description: 'Course start date',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  startDate: Date | null;

  @ApiPropertyOptional({
    description: 'Course end date',
    example: '2024-12-31T23:59:59.000Z',
    nullable: true,
  })
  endDate: Date | null;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  enrollmentStatus: EnrollmentStatus;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-01-15T10:30:00Z',
  })
  enrolledAt: Date;

  @ApiProperty({
    description: 'Course completion percentage',
    example: 45.5,
    minimum: 0,
    maximum: 100,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Whether the course is completed',
    example: false,
  })
  completed: boolean;
}
