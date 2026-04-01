import { ApiProperty } from '@nestjs/swagger';

/**
 * Individual struggling learner data
 * Requirements: 14.7
 */
export class StrugglingLearnerItemDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'First name', required: false })
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  lastName?: string;

  @ApiProperty({ description: 'Completion percentage (0-100)' })
  completionPercentage: number;

  @ApiProperty({ description: 'Average quiz score', required: false })
  averageQuizScore?: number;

  @ApiProperty({ description: 'Days since last activity' })
  daysSinceLastActivity: number;

  @ApiProperty({ description: 'Days since enrollment' })
  daysSinceEnrollment: number;

  @ApiProperty({ description: 'Enrollment date' })
  enrolledAt: Date;

  @ApiProperty({ description: 'Last activity date', required: false })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Reasons for struggling', type: [String] })
  strugglingReasons: string[];
}

/**
 * Response DTO for struggling learners
 * Requirements: 14.7
 */
export class StrugglingLearnersDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'List of struggling learners', type: [StrugglingLearnerItemDto] })
  learners: StrugglingLearnerItemDto[];

  @ApiProperty({ description: 'Total count of struggling learners' })
  totalCount: number;

  @ApiProperty({ description: 'Criteria used for identification' })
  criteria: {
    lowQuizScoreThreshold: number;
    inactivityDaysThreshold: number;
    lowCompletionThreshold: number;
    lowCompletionDaysThreshold: number;
  };
}
