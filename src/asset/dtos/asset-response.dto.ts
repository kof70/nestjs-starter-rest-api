import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for asset response
 * Requirements: 18.5
 */
export class AssetResponseDto {
  @ApiProperty({
    description: 'Asset unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Stored filename',
    example: '1234567890-abc123.jpg',
  })
  filename: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'my-image.jpg',
  })
  originalName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type',
    example: 'image/jpeg',
  })
  mimeType: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Uploader user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  uploadedBy: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: Date;

  @ApiProperty({
    description: 'Asset URL',
    example: '/api/assets/123e4567-e89b-12d3-a456-426614174000',
  })
  url: string;

  @ApiProperty({
    description: 'Usage count across content items',
    example: 3,
  })
  usageCount: number;
}
