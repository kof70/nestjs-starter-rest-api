import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '@prisma/client';

export class CreateContentItemDto {
  @ApiProperty({
    description: 'Content item title',
    example: 'Introduction to Variables',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Content type',
    enum: ContentType,
    example: ContentType.TEXT,
  })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiPropertyOptional({
    description: 'Whether this content is mandatory for course completion',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  mandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Text content in markdown format (required for TEXT type)',
    example: '# Introduction\n\nThis is a markdown content...',
  })
  @ValidateIf((o) => o.type === ContentType.TEXT)
  @IsString()
  @IsNotEmpty()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Video URL (required for VIDEO type)',
    example: 'https://example.com/video.mp4',
  })
  @ValidateIf((o) => o.type === ContentType.VIDEO)
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Video embed code (optional for VIDEO type)',
    example: '<iframe src="..."></iframe>',
  })
  @ValidateIf((o) => o.type === ContentType.VIDEO)
  @IsString()
  @IsOptional()
  videoEmbedCode?: string;

  @ApiPropertyOptional({
    description: 'Document URL (required for DOCUMENT type)',
    example: 'https://example.com/document.pdf',
  })
  @ValidateIf((o) => o.type === ContentType.DOCUMENT)
  @IsString()
  @IsNotEmpty()
  documentUrl?: string;
}
