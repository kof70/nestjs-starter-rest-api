import { ApiProperty } from '@nestjs/swagger';
import { CourseGradeDto } from './course-grade.dto';

export class GradeBreakdownDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: 'Complete course grade breakdown',
    type: CourseGradeDto,
  })
  courseGrade: CourseGradeDto;

  @ApiProperty({
    description: 'Timestamp of grade calculation',
    example: '2024-01-15T10:30:00Z',
  })
  calculatedAt: Date;
}
