import { ApiProperty } from '@nestjs/swagger';

export class ItemGradeDto {
  @ApiProperty({
    description: 'Content item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  contentItemId: string;

  @ApiProperty({
    description: 'Content item title',
    example: 'Introduction Quiz',
  })
  contentItemTitle: string;

  @ApiProperty({
    description: 'Grade score (0-100)',
    example: 85.5,
  })
  score: number;

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
