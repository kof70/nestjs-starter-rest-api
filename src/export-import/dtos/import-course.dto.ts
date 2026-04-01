import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for course import
 * Requirements: 16.5, 16.6
 */
export class ImportCourseDto {
  @ApiProperty({
    description: 'Base64 encoded JSON course data',
    example: 'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJleHBvcnRlZEF0IjoiMjAyNC0wMS0wMVQwMDowMDowMC4wMDBaIiwuLi59',
  })
  @IsNotEmpty()
  @IsString()
  data: string;
}

/**
 * Import result with errors and warnings
 * Requirements: 16.8
 */
export interface ImportResult {
  success: boolean;
  courseId?: string;
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  field: string;
  message: string;
  code: string;
}

export interface ImportWarning {
  field: string;
  message: string;
  code: string;
}
