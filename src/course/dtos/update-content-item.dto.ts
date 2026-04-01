import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateContentItemDto {
  @ApiPropertyOptional({
    description: 'Content item title',
    example: 'Introduction to Variables',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Whether this content is mandatory for course completion',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Text content in markdown format (for TEXT type)',
    example: '# Introduction\n\nThis is a markdown content...',
  })
  @IsString()
  @IsOptional()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Video URL (for VIDEO type)',
    example: 'https://example.com/video.mp4',
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video embed code (for VIDEO type)',
    example: '<iframe src="..."></iframe>',
  })
  @IsString()
  @IsOptional()
  videoEmbedCode?: string;

  @ApiPropertyOptional({
    description: 'Document URL (for DOCUMENT type)',
    example: 'https://example.com/document.pdf',
  })
  @IsString()
  @IsOptional()
  documentUrl?: string;
}
