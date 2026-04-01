import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for video response
 * Requirements: 19.5, 19.8, 19.9
 */
export class VideoResponseDto {
  @ApiProperty({
    description: 'Video ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Video title',
    example: 'Introduction to NestJS',
  })
  title: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Learn the basics of NestJS framework',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 300,
    required: false,
  })
  duration?: number;

  @ApiProperty({
    description: 'Video format (e.g., MP4, WebM) or quality (SD, HD, FHD)',
    example: 'MP4',
    required: false,
  })
  format?: string;

  @ApiProperty({
    description: 'Video URL (presigned or YouTube)',
    example: 'https://storage.example.com/videos/abc123.mp4',
  })
  url: string;

  @ApiProperty({
    description: 'Content item ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  contentItemId: string;

  @ApiProperty({
    description: 'Uploader user ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  uploadedBy: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;

  @ApiProperty({
    description: 'Whether this is a YouTube video',
    example: false,
  })
  isYouTube: boolean;

  @ApiProperty({
    description: 'Thumbnail URL (or default placeholder)',
    example: 'https://storage.example.com/thumbnails/abc123.jpg',
  })
  thumbnailUrl: string;
}
