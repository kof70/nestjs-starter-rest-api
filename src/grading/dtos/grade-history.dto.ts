import { ApiProperty } from '@nestjs/swagger';

export class GradeHistoryEntryDto {
  @ApiProperty({
    description: 'Grade record ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Content item ID if item-level grade',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  contentItemId?: string;

  @ApiProperty({
    description: 'Content item title',
    example: 'Introduction Quiz',
    required: false,
  })
  contentItemTitle?: string;

  @ApiProperty({
    description: 'Module ID if module-level grade',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  moduleId?: string;

  @ApiProperty({
    description: 'Module title',
    example: 'Introduction to Programming',
    required: false,
  })
  moduleTitle?: string;

  @ApiProperty({
    description: 'Grade score (0-100)',
    example: 85.5,
  })
  grade: number;

  @ApiProperty({
    description: 'Weight for weighted grading',
    example: 1.0,
  })
  weight: number;

  @ApiProperty({
    description: 'Whether the grade was manually overridden',
    example: false,
  })
  overridden: boolean;

  @ApiProperty({
    description: 'Reason for override if applicable',
    example: 'Technical issue during quiz',
    required: false,
  })
  overrideReason?: string;

  @ApiProperty({
    description: 'Grade creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

export class GradeHistoryDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Historical grade records',
    type: [GradeHistoryEntryDto],
  })
  history: GradeHistoryEntryDto[];
}
