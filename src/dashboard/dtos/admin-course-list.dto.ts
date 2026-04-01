import { ApiProperty } from '@nestjs/swagger';
import { CourseStatus, Language } from '@prisma/client';

/**
 * DTO for individual course in admin course list
 * Requirements: 8.7
 */
export class AdminCourseItemDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to Web Development',
  })
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the fundamentals of web development',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Course language',
    enum: Language,
    example: Language.EN,
  })
  language: Language;

  @ApiProperty({
    description: 'Course status',
    enum: CourseStatus,
    example: CourseStatus.PUBLISHED,
  })
  status: CourseStatus;

  @ApiProperty({
    description: 'Course owner ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  ownerId: string;

  @ApiProperty({
    description: 'Course owner email',
    example: 'instructor@example.com',
  })
  ownerEmail: string;

  @ApiProperty({
    description: 'Course owner name',
    example: 'Jane Smith',
  })
  ownerName: string;

  @ApiProperty({
    description: 'Number of modules in the course',
    example: 8,
  })
  moduleCount: number;

  @ApiProperty({
    description: 'Number of active enrollments',
    example: 125,
  })
  enrollmentCount: number;

  @ApiProperty({
    description: 'Number of completed enrollments',
    example: 45,
  })
  completedEnrollmentCount: number;

  @ApiProperty({
    description: 'Course creation date',
    example: '2024-01-10T09:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-03-15T16:30:00Z',
  })
  updatedAt: Date;
}

/**
 * DTO for paginated admin course list
 * Requirements: 8.7
 */
export class AdminCourseListDto {
  @ApiProperty({
    description: 'List of courses',
    type: [AdminCourseItemDto],
  })
  courses: AdminCourseItemDto[];

  @ApiProperty({
    description: 'Total number of courses matching the query',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}
