import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

/**
 * Response DTO for content items in LMS with progress tracking
 * Requirements: 5.4, 6.1
 */
export class LmsContentItemResponseDto {
  @ApiProperty({
    description: 'Content item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Content item title',
    example: 'Introduction to Variables',
  })
  title: string;

  @ApiProperty({
    description: 'Content type',
    enum: ContentType,
    example: ContentType.TEXT,
  })
  type: ContentType;

  @ApiProperty({
    description: 'Order within the module',
    example: 1,
  })
  order: number;

  @ApiProperty({
    description: 'Whether this content is mandatory for course completion',
    example: true,
  })
  mandatory: boolean;

  @ApiPropertyOptional({
    description: 'Text content in markdown format (for TEXT type)',
    example: '# Introduction\n\nThis is a markdown content...',
  })
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Video URL (for VIDEO type)',
    example: 'https://example.com/video.mp4',
  })
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video embed code (for VIDEO type)',
    example: '<iframe src="..."></iframe>',
  })
  videoEmbedCode?: string;

  @ApiPropertyOptional({
    description: 'Document URL (for DOCUMENT type)',
    example: 'https://example.com/document.pdf',
  })
  documentUrl?: string;

  @ApiProperty({
    description: 'Whether this content item is completed',
    example: true,
  })
  completed: boolean;

  @ApiProperty({
    description: 'Time spent on this content item in seconds',
    example: 300,
  })
  timeSpent: number;

  @ApiPropertyOptional({
    description: 'Completion timestamp',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  completedAt: Date | null;
}
