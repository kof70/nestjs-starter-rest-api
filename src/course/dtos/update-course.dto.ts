import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Language, CourseStatus } from '@prisma/client';

export class UpdateCourseDto {
  @ApiPropertyOptional({ description: 'Course title', example: 'Introduction to NestJS' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn the fundamentals of NestJS framework' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Course language', enum: Language, example: Language.EN })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({ description: 'Course status', enum: CourseStatus, example: CourseStatus.DRAFT })
  @IsEnum(CourseStatus)
  @IsOptional()
  status?: CourseStatus;

  @ApiPropertyOptional({ description: 'Enrollment start date', example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  enrollmentStart?: string;

  @ApiPropertyOptional({ description: 'Enrollment end date', example: '2024-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  enrollmentEnd?: string;

  @ApiPropertyOptional({ description: 'Course start date', example: '2024-01-15T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  courseStart?: string;

  @ApiPropertyOptional({ description: 'Course end date', example: '2024-06-30T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  courseEnd?: string;
}
