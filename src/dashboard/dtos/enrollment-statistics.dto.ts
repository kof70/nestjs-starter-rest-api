import { ApiProperty } from '@nestjs/swagger';

export class EnrollmentStatisticsDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Total number of enrolled learners',
    example: 150,
  })
  totalEnrolled: number;

  @ApiProperty({
    description: 'Number of active enrollments',
    example: 120,
  })
  activeEnrollments: number;

  @ApiProperty({
    description: 'Number of completed enrollments',
    example: 25,
  })
  completedEnrollments: number;

  @ApiProperty({
    description: 'Number of inactive enrollments',
    example: 5,
  })
  inactiveEnrollments: number;

  @ApiProperty({
    description: 'Completion rate as percentage',
    example: 16.67,
  })
  completionRate: number;
}
