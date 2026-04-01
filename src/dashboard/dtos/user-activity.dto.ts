import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus, Language, UserRole } from '@prisma/client';

/**
 * DTO for individual user activity item
 * Requirements: 8.7
 */
export class UserActivityItemDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.LEARNER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Course ID',
    example: '456e7890-e89b-12d3-a456-426614174111',
  })
  courseId: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to TypeScript',
  })
  courseTitle: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  enrollmentStatus: EnrollmentStatus;

  @ApiProperty({
    description: 'Course progress percentage',
    example: 67.5,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Number of quiz attempts',
    example: 3,
  })
  quizAttempts: number;

  @ApiProperty({
    description: 'Average quiz score',
    example: 85.5,
    required: false,
  })
  averageQuizScore?: number;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-03-20T14:45:00Z',
    required: false,
  })
  lastActivityAt?: Date;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-01-15T10:30:00Z',
  })
  enrolledAt: Date;
}

/**
 * DTO for paginated user activity list
 * Requirements: 8.7
 */
export class UserActivityListDto {
  @ApiProperty({
    description: 'List of user activities',
    type: [UserActivityItemDto],
  })
  activities: UserActivityItemDto[];

  @ApiProperty({
    description: 'Total number of activity records',
    example: 1250,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 63,
  })
  totalPages: number;
}
