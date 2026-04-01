import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

/**
 * DTO for updating video metadata
 * Requirements: 19.5
 */
export class UpdateVideoDto {
  @ApiProperty({
    description: 'Video title',
    example: 'Introduction to NestJS - Updated',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Video description',
    example: 'Learn the basics of NestJS framework - Updated content',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Video duration in seconds',
    example: 300,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;
}
