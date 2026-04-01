import { ApiProperty } from '@nestjs/swagger';
import { ItemGradeDto } from './item-grade.dto';

export class ModuleGradeDto {
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
    description: 'Calculated module grade (0-100)',
    example: 87.5,
  })
  grade: number;

  @ApiProperty({
    description: 'Letter grade for the module',
    example: 'B+',
  })
  letterGrade: string;

  @ApiProperty({
    description: 'Individual item grades within the module',
    type: [ItemGradeDto],
  })
  itemGrades: ItemGradeDto[];

  @ApiProperty({
    description: 'Number of graded items in the module',
    example: 3,
  })
  totalItems: number;

  @ApiProperty({
    description: 'Number of completed graded items',
    example: 3,
  })
  completedItems: number;
}
