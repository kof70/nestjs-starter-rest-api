import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TabType } from '@prisma/client';

/**
 * DTO for tab response
 * Requirements: 20.1, 20.2, 20.3
 */
export class TabResponseDto {
  @ApiProperty({
    description: 'Tab ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  courseId: string;

  @ApiProperty({
    description: 'Tab title',
    example: 'Course Resources',
  })
  title: string;

  @ApiProperty({
    description: 'Tab type',
    enum: TabType,
    example: TabType.CONTENT,
  })
  type: TabType;

  @ApiProperty({
    description: 'Tab order position',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Tab visibility',
    example: true,
  })
  visible: boolean;

  @ApiPropertyOptional({
    description: 'Rich text content for static tabs',
    example: '<h1>Welcome</h1>',
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'External URL for link tabs',
    example: 'https://example.com/resources',
  })
  externalUrl?: string;

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
