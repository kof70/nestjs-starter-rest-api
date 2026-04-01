import { ApiProperty } from '@nestjs/swagger';
import { UserRole, Language } from '@prisma/client';

/**
 * DTO for individual user in admin user list
 * Requirements: 8.7
 */
export class AdminUserItemDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.LEARNER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User preferred language',
    enum: Language,
    example: Language.EN,
  })
  language: Language;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Number of courses owned (for instructors)',
    example: 3,
  })
  coursesOwnedCount: number;

  @ApiProperty({
    description: 'Number of active enrollments',
    example: 5,
  })
  activeEnrollmentsCount: number;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-03-20T14:45:00Z',
  })
  updatedAt: Date;
}

/**
 * DTO for paginated admin user list
 * Requirements: 8.7
 */
export class AdminUserListDto {
  @ApiProperty({
    description: 'List of users',
    type: [AdminUserItemDto],
  })
  users: AdminUserItemDto[];

  @ApiProperty({
    description: 'Total number of users matching the query',
    example: 1250,
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
    example: 63,
  })
  totalPages: number;
}
