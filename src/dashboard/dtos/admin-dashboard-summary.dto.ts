import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for admin dashboard summary statistics
 * Requirements: 8.7
 */
export class AdminDashboardSummaryDto {
  @ApiProperty({
    description: 'Total number of users in the system',
    example: 1250,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Total number of courses in the system',
    example: 45,
  })
  totalCourses: number;

  @ApiProperty({
    description: 'Total number of enrollments across all courses',
    example: 3420,
  })
  totalEnrollments: number;

  @ApiProperty({
    description: 'Total number of active enrollments',
    example: 2890,
  })
  activeEnrollments: number;

  @ApiProperty({
    description: 'Total number of completed enrollments',
    example: 450,
  })
  completedEnrollments: number;

  @ApiProperty({
    description: 'Number of users by role',
    example: { ADMIN: 5, INSTRUCTOR: 50, LEARNER: 1195 },
  })
  usersByRole: Record<string, number>;

  @ApiProperty({
    description: 'Number of courses by status',
    example: { DRAFT: 10, PUBLISHED: 30, ARCHIVED: 5 },
  })
  coursesByStatus: Record<string, number>;

  @ApiProperty({
    description: 'Overall completion rate across all courses',
    example: 13.16,
  })
  overallCompletionRate: number;

  @ApiProperty({
    description: 'Total number of certificates issued',
    example: 450,
  })
  totalCertificates: number;

  @ApiProperty({
    description: 'Total number of quiz attempts',
    example: 8750,
  })
  totalQuizAttempts: number;
}
