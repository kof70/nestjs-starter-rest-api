import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Progress status filter enum
 * Requirements: 14.4
 */
export enum ProgressStatusFilter {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ALL = 'ALL',
}

/**
 * Query DTO for filtering learners
 * Requirements: 14.4
 */
export class FilterLearnersQueryDto {
  @ApiProperty({
    enum: ProgressStatusFilter,
    required: false,
    description: 'Filter learners by progress status',
    default: ProgressStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(ProgressStatusFilter)
  status?: ProgressStatusFilter = ProgressStatusFilter.ALL;
}

/**
 * Individual learner data for filtered results
 * Requirements: 14.4
 */
export class FilteredLearnerItemDto {
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

  @ApiProperty({ description: 'Enrollment date' })
  enrolledAt: Date;

  @ApiProperty({ description: 'Last activity date', required: false })
  lastActivityAt?: Date;

  @ApiProperty({ description: 'Average quiz score', required: false })
  averageQuizScore?: number;

  @ApiProperty({ description: 'Progress status' })
  status: string;
}

/**
 * Response DTO for filtered learners
 * Requirements: 14.4
 */
export class FilteredLearnersDto {
  @ApiProperty({ description: 'Course ID' })
  courseId: string;

  @ApiProperty({ description: 'Applied filter status' })
  filterStatus: ProgressStatusFilter;

  @ApiProperty({ description: 'List of filtered learners', type: [FilteredLearnerItemDto] })
  learners: FilteredLearnerItemDto[];

  @ApiProperty({ description: 'Total count of filtered learners' })
  totalCount: number;
}
