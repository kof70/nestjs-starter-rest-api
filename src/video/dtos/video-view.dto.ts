import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for video view tracking
 * Requirements: 19.8
 */
export class VideoViewDto {
  @ApiProperty({
    description: 'Video ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  videoId: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  userId: string;

  @ApiProperty({
    description: 'View timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  viewedAt: Date;
}
