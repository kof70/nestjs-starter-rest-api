import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for updating a tab
 * Requirements: 20.1, 20.3, 20.5, 20.7, 20.8
 */
export class UpdateTabDto {
  @ApiPropertyOptional({
    description: 'Tab title',
    example: 'Updated Resources',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Rich text content for static tabs (HTML/Markdown)',
    example: '<h1>Updated Content</h1><p>This is the updated content.</p>',
    maxLength: 50000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50000)
  content?: string;

  @ApiPropertyOptional({
    description: 'External URL for link tabs (must use HTTP or HTTPS)',
    example: 'https://example.com/new-resources',
  })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'Invalid URL format. Must use HTTP or HTTPS protocol' },
  )
  @IsOptional()
  externalUrl?: string;

  @ApiPropertyOptional({
    description: 'Tab visibility (at least one Content tab must remain visible)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}
