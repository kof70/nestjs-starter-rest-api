import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

export class QuestionOptionResponseDto {
  @ApiProperty({ description: 'Option ID' })
  id: string;

  @ApiProperty({ description: 'Option text' })
  optionText: string;

  @ApiProperty({ description: 'Option order' })
  order: number;

  @ApiPropertyOptional({ description: 'Whether this option is correct (only shown after completion)' })
  isCorrect?: boolean;
}

export class QuestionResponseDto {
  @ApiProperty({ description: 'Question ID' })
  id: string;

  @ApiProperty({ description: 'Question text' })
  questionText: string;

  @ApiProperty({ description: 'Question order' })
  order: number;

  @ApiProperty({ description: 'Question options', type: [QuestionOptionResponseDto] })
  options: QuestionOptionResponseDto[];
}

export class QuizResponseDto {
  @ApiProperty({ description: 'Quiz ID' })
  id: string;

  @ApiProperty({ description: 'Content item ID' })
  contentItemId: string;

  @ApiProperty({ description: 'Passing score percentage' })
  passingScore: number;

  @ApiProperty({ description: 'Maximum number of attempts' })
  maxAttempts: number;

  @ApiProperty({ description: 'Quiz questions', type: [QuestionResponseDto] })
  questions: QuestionResponseDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export class QuizAttemptResponseDto {
  @ApiProperty({ description: 'Attempt ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Quiz ID' })
  quizId: string;

  @ApiProperty({ description: 'Score achieved' })
  score: number;

  @ApiProperty({ description: 'Attempt number' })
  attemptNumber: number;

  @ApiProperty({ description: 'Completion timestamp' })
  completedAt: Date;

  @ApiPropertyOptional({ description: 'User answers', type: 'object' })
  answers?: Prisma.JsonValue;
}

export class QuizSubmissionResultDto {
  @ApiProperty({ description: 'Quiz attempt details', type: QuizAttemptResponseDto })
  attempt: QuizAttemptResponseDto;

  @ApiProperty({ description: 'Whether the quiz was passed' })
  passed: boolean;

  @ApiProperty({ description: 'Passing score required' })
  passingScore: number;

  @ApiProperty({ description: 'Number of attempts remaining' })
  attemptsRemaining: number;

  @ApiProperty({ description: 'Correct answers', type: [QuestionResponseDto] })
  correctAnswers: QuestionResponseDto[];
}
