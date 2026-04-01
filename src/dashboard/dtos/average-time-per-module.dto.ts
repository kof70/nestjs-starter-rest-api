import { ApiProperty } from '@nestjs/swagger';

export class ModuleTimeStatisticsDto {
  @ApiProperty({
    description: 'Module ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  moduleId: string;

  @ApiProperty({
    description: 'Module title',
    example: 'Introduction to Programming',
  })
  moduleTitle: string;

  @ApiProperty({
    description: 'Average time spent in seconds',
    example: 3600,
  })
  averageTimeSpent: number;

  @ApiProperty({
    description: 'Total number of learners who accessed this module',
    example: 45,
  })
  learnerCount: number;

  @ApiProperty({
    description: 'Total time spent by all learners in seconds',
    example: 162000,
  })
  totalTimeSpent: number;
}

export class AverageTimePerModuleDto {
  @ApiProperty({
    description: 'Course ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  courseId: string;

  @ApiProperty({
    description: 'List of module time statistics',
    type: [ModuleTimeStatisticsDto],
  })
  modules: ModuleTimeStatisticsDto[];

  @ApiProperty({
    description: 'Average time spent across all modules in seconds',
    example: 3200,
  })
  overallAverageTime: number;
}
