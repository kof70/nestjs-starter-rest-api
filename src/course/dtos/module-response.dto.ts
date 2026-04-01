import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleResponseDto {
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
  description?: string | null;

  @ApiProperty({
    description: 'Module order within the course',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiPropertyOptional({
    description: 'Prerequisite module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  prerequisiteId?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
