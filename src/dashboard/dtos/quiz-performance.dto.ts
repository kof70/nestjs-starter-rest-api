import { ApiProperty } from '@nestjs/swagger';

export class QuizAttemptSummaryDto {
  @ApiProperty({
    description: 'Quiz attempt ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  attemptId: string;

  @ApiProperty({
    description: 'Attempt number',
    example: 1,
  })
  attemptNumber: number;

  @ApiProperty({
    description: 'Score achieved',
    example: 85.5,
  })
  score: number;

  @ApiProperty({
    description: 'Completion date',
    example: '2024-01-20T14:45:00Z',
  })
  completedAt: Date;
}

export class LearnerQuizPerformanceDto {
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
    description: 'Quiz ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  quizId: string;

  @ApiProperty({
    description: 'Quiz title',
    example: 'Module 1 Assessment',
  })
  quizTitle: string;

  @ApiProperty({
    description: 'Best score achieved',
    example: 92.0,
  })
  bestScore: number;

  @ApiProperty({
    description: 'Number of attempts',
    example: 2,
  })
  attemptCount: number;

  @ApiProperty({
    description: 'List of all attempts',
    type: [QuizAttemptSummaryDto],
  })
  attempts: QuizAttemptSummaryDto[];
}

export class QuizPerformanceDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'List of learner quiz performance data',
    type: [LearnerQuizPerformanceDto],
  })
  learnerPerformance: LearnerQuizPerformanceDto[];

  @ApiProperty({
    description: 'Average score across all learners',
    example: 78.5,
  })
  averageScore: number;

  @ApiProperty({
    description: 'Total number of quiz attempts',
    example: 150,
  })
  totalAttempts: number;
}
