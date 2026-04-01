import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for creating a new announcement
 * Requirements: 21.1, 21.2, 21.9
 */
export class CreateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'Important Course Update',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Announcement content in rich text format (max 5000 characters)',
    example: '<p>Please note that the quiz deadline has been extended to next Friday.</p>',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Announcement content cannot exceed 5000 characters' })
  content: string;
}
