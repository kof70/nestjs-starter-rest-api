import { ApiProperty } from '@nestjs/swagger';
import { ModuleGradeDto } from './module-grade.dto';

export class CourseGradeDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'Course title',
    example: 'Full Stack Web Development',
  })
  courseTitle: string;

  @ApiProperty({
    description: 'Overall course grade (0-100)',
    example: 88.3,
  })
  grade: number;

  @ApiProperty({
    description: 'Letter grade representation',
    example: 'B+',
  })
  letterGrade: string;

  @ApiProperty({
    description: 'Module grades breakdown',
    type: [ModuleGradeDto],
  })
  moduleGrades: ModuleGradeDto[];

  @ApiProperty({
    description: 'Total number of modules in the course',
    example: 5,
  })
  totalModules: number;

  @ApiProperty({
    description: 'Number of modules with grades',
    example: 5,
  })
  gradedModules: number;
}
