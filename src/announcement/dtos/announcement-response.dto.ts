import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for announcement response
 * Requirements: 21.1, 21.2, 21.3, 21.4
 */
export class AnnouncementResponseDto {
  @ApiProperty({
    description: 'Announcement unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  courseId: string;

  @ApiProperty({
    description: 'Announcement title',
    example: 'Important Course Update',
  })
  title: string;

  @ApiProperty({
    description: 'Announcement content in rich text format',
    example: '<p>Please note that the quiz deadline has been extended.</p>',
  })
  content: string;

  @ApiProperty({
    description: 'Soft deletion flag',
    example: false,
  })
  deleted: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}
