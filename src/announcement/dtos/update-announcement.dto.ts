import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for updating an announcement
 * Requirements: 21.6, 21.9
 */
export class UpdateAnnouncementDto {
  @ApiPropertyOptional({
    description: 'Announcement title',
    example: 'Updated Course Information',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Announcement content in rich text format (max 5000 characters)',
    example: '<p>Updated information about the course schedule.</p>',
    maxLength: 5000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Announcement content cannot exceed 5000 characters' })
  content?: string;
}
