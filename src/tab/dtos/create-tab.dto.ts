import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsNotEmpty,
  ValidateIf,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new tab
 * Requirements: 20.1, 20.3, 20.7, 20.8
 * 
 * NOTE: TabType enum values are defined in prisma/schema.prisma
 * Valid values: CUSTOM_STATIC, CUSTOM_LINK (default tabs cannot be created)
 */

enum TabTypeEnum {
  COURSE_INFO = 'COURSE_INFO',
  SYLLABUS = 'SYLLABUS',
  CONTENT = 'CONTENT',
  PROGRESS = 'PROGRESS',
  DISCUSSION = 'DISCUSSION',
  CUSTOM_STATIC = 'CUSTOM_STATIC',
  CUSTOM_LINK = 'CUSTOM_LINK',
}

export class CreateTabDto {
  @ApiProperty({
    description: 'Tab title',
    example: 'Course Resources',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Tab type (only CUSTOM_STATIC and CUSTOM_LINK can be created)',
    enum: TabTypeEnum,
    example: 'CUSTOM_STATIC',
  })
  @IsEnum(TabTypeEnum)
  type: string;

  @ApiPropertyOptional({
    description: 'Rich text content for static tabs (required for CUSTOM_STATIC type, max 50000 chars)',
    example: '<h1>Welcome</h1><p>Course resources and materials...</p>',
    maxLength: 50000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50000)
  @ValidateIf((o) => o.type === 'CUSTOM_STATIC')
  @IsNotEmpty({ message: 'Content is required for CUSTOM_STATIC tabs' })
  content?: string;

  @ApiPropertyOptional({
    description: 'External URL for link tabs (required for CUSTOM_LINK type, must use HTTP or HTTPS)',
    example: 'https://example.com/resources',
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'Invalid URL format. Must use HTTP or HTTPS protocol' },
  )
  @IsOptional()
  @ValidateIf((o) => o.type === 'CUSTOM_LINK')
  @IsNotEmpty({ message: 'External URL is required for CUSTOM_LINK tabs' })
  externalUrl?: string;
}
