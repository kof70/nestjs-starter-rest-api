import { ApiProperty } from '@nestjs/swagger';

/**
 * Content item reference information
 */
export class ContentItemReferenceDto {
  @ApiProperty({
    description: 'Content item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Content item title',
    example: 'Introduction to Programming',
  })
  title: string;

  @ApiProperty({
    description: 'Module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Module title',
    example: 'Module 1: Basics',
  })
  moduleTitle: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Complete Programming Course',
  })
  courseTitle: string;
}

/**
 * DTO for asset usage details
 * Requirements: 18.11
 */
export class AssetUsageDto {
  @ApiProperty({
    description: 'Asset ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  assetId: string;

  @ApiProperty({
    description: 'Number of content items using this asset',
    example: 3,
  })
  usageCount: number;

  @ApiProperty({
    description: 'List of content items referencing this asset',
    type: [ContentItemReferenceDto],
  })
  contentItems: ContentItemReferenceDto[];
}
