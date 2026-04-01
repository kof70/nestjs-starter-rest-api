import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType } from '@prisma/client';

export class ContentItemResponseDto {
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

  @ApiProperty({
    description: 'Module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  moduleId: string;

  @ApiPropertyOptional({
    description: 'Text content in markdown format (for TEXT type)',
    example: '# Introduction\n\nThis is a markdown content...',
  })
  textContent?: string | null;

  @ApiPropertyOptional({
    description: 'Video URL (for VIDEO type)',
    example: 'https://example.com/video.mp4',
  })
  videoUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Video embed code (for VIDEO type)',
    example: '<iframe src="..."></iframe>',
  })
  videoEmbedCode?: string | null;

  @ApiPropertyOptional({
    description: 'Document URL (for DOCUMENT type)',
    example: 'https://example.com/document.pdf',
  })
  documentUrl?: string | null;

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
