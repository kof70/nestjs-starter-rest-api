import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

export class EnrollmentResponseDto {
  @ApiProperty({
    description: 'Enrollment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  @ApiProperty({
    description: 'Enrollment date',
    example: '2024-01-15T10:30:00Z',
  })
  enrolledAt: Date;

  @ApiProperty({
    description: 'Completion date',
    example: '2024-03-15T10:30:00Z',
    nullable: true,
  })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to NestJS',
    required: false,
  })
  courseTitle?: string;

  @ApiProperty({
    description: 'Course description',
    example: 'Learn the basics of NestJS framework',
    required: false,
  })
  courseDescription?: string;
}
