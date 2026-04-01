import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Language, CourseStatus, ContentType } from '@prisma/client';

export class CourseResponseDto {
  @ApiProperty({ description: 'Course ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Course title', example: 'Introduction to NestJS' })
  title: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn the fundamentals of NestJS framework' })
  description?: string | null;

  @ApiProperty({ description: 'Course language', enum: Language, example: Language.EN })
  language: Language;

  @ApiProperty({ description: 'Course status', enum: CourseStatus, example: CourseStatus.DRAFT })
  status: CourseStatus;

  @ApiPropertyOptional({ description: 'Enrollment start date', example: '2024-01-01T00:00:00Z' })
  enrollmentStart?: Date | null;

  @ApiPropertyOptional({ description: 'Enrollment end date', example: '2024-12-31T23:59:59Z' })
  enrollmentEnd?: Date | null;

  @ApiPropertyOptional({ description: 'Course start date', example: '2024-01-15T00:00:00Z' })
  courseStart?: Date | null;

  @ApiPropertyOptional({ description: 'Course end date', example: '2024-06-30T23:59:59Z' })
  courseEnd?: Date | null;

  @ApiProperty({ description: 'Course version', example: 1 })
  version: number;

  @ApiProperty({ description: 'Course owner ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerId: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-01T00:00:00Z' })
  updatedAt: Date;
}

export class InstructorInfoDto {
  @ApiProperty({ description: 'Instructor ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Instructor email', example: 'instructor@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'Instructor first name', example: 'John' })
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'Instructor last name', example: 'Doe' })
  lastName?: string | null;
}

export class ContentItemSummaryDto {
  @ApiProperty({ description: 'Content item ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Content item title', example: 'Introduction to Controllers' })
  title: string;

  @ApiProperty({ description: 'Content type', enum: ContentType, example: ContentType.VIDEO })
  type: ContentType;

  @ApiProperty({ description: 'Content order within module', example: 1 })
  order: number;

  @ApiProperty({ description: 'Whether content is mandatory', example: true })
  mandatory: boolean;
}

export class ModuleSummaryDto {
  @ApiProperty({ description: 'Module ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'Module title', example: 'Getting Started' })
  title: string;

  @ApiPropertyOptional({ description: 'Module description', example: 'Learn the basics' })
  description?: string | null;

  @ApiProperty({ description: 'Module order within course', example: 1 })
  order: number;

  @ApiProperty({ type: [ContentItemSummaryDto], description: 'Content items in this module' })
  contentItems: ContentItemSummaryDto[];
}

export class CourseDetailResponseDto extends CourseResponseDto {
  @ApiProperty({ type: InstructorInfoDto, description: 'Course instructor information' })
  instructor: InstructorInfoDto;

  @ApiProperty({ type: [ModuleSummaryDto], description: 'Course modules with content structure' })
  modules: ModuleSummaryDto[];
}

export class PaginatedCourseResponseDto {
  @ApiProperty({ type: [CourseResponseDto], description: 'List of courses' })
  data: CourseResponseDto[];

  @ApiProperty({ description: 'Total number of courses', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total pages', example: 5 })
  totalPages: number;
}
