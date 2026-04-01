import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

/**
 * Video quality enum
 * Requirements: 19.10
 */
export enum VideoQuality {
  SD = 'SD',
  HD = 'HD',
  FHD = 'FHD',
}

/**
 * DTO for updating video quality
 * Requirements: 19.10
 */
export class UpdateQualityDto {
  @ApiProperty({
    description: 'Video quality',
    enum: VideoQuality,
    example: VideoQuality.HD,
  })
  @IsEnum(VideoQuality)
  quality: VideoQuality;
}
