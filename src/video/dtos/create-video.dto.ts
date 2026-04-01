import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsUUID } from 'class-validator';

/**
 * DTO for creating a video with file upload
 * Requirements: 19.1, 19.5
 */
export class CreateVideoDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Introduction to NestJS',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Learn the basics of NestJS framework',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Course ID to associate the video with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({
    description: 'Content item ID to associate the video with',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  @IsNotEmpty()
  contentItemId: string;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 300,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @ApiProperty({
    description: 'Video format (e.g., MP4, WebM)',
    example: 'MP4',
    required: false,
  })
  @IsString()
  @IsOptional()
  format?: string;
}
