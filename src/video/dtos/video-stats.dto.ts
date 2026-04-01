import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for video statistics
 * Requirements: 19.8
 */
export class VideoStatsDto {
  @ApiProperty({
    description: 'Video ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  videoId: string;

  @ApiProperty({
    description: 'Total number of views',
    example: 150,
  })
  totalViews: number;

  @ApiProperty({
    description: 'Number of unique viewers',
    example: 45,
  })
  uniqueViewers: number;
}
