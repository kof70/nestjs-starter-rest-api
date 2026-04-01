import { ApiProperty } from '@nestjs/swagger';

export class LearnerProgressItemDto {
  @ApiProperty({
    description: 'Learner user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Learner email',
    example: 'learner@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Learner first name',
    example: 'John',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'Learner last name',
    example: 'Doe',
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'Course completion percentage',
    example: 75.5,
  })
  completionPercentage: number;

  @ApiProperty({
    description: 'Total mandatory content items',
    example: 20,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Completed mandatory content items',
    example: 15,
  })
  completedItems: number;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-01-15T10:30:00Z',
  })
  enrolledAt: Date;

  @ApiProperty({
    description: 'Last activity date',
    example: '2024-01-20T14:45:00Z',
    required: false,
  })
  lastActivityAt?: Date;
}

export class LearnerProgressSummaryDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'List of learner progress data',
    type: [LearnerProgressItemDto],
  })
  learners: LearnerProgressItemDto[];

  @ApiProperty({
    description: 'Total number of learners',
    example: 50,
  })
  totalLearners: number;
}
