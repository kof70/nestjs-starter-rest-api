import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for module navigation in LMS with prerequisite locking
 * Requirements: 5.3, 5.7
 */
export class LmsModuleNavigationResponseDto {
  @ApiProperty({
    description: 'Module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Module title',
    example: 'Introduction to Programming',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Module description',
    example: 'Learn the basics of programming',
  })
  description?: string;

  @ApiProperty({
    description: 'Module order within the course',
    example: 1,
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Prerequisite module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  prerequisiteId?: string | null;

  @ApiProperty({
    description: 'Whether this module is locked due to unmet prerequisites',
    example: false,
  })
  locked: boolean;

  @ApiProperty({
    description: 'Module completion percentage',
    example: 75.0,
    minimum: 0,
    maximum: 100,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Whether the module is completed',
    example: false,
  })
  completed: boolean;

  @ApiProperty({
    description: 'Total number of content items in the module',
    example: 10,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Number of completed content items',
    example: 7,
  })
  completedItems: number;
}
