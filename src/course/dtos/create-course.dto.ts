import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { Language } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ description: 'Course title', example: 'Introduction to NestJS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Course description', example: 'Learn the fundamentals of NestJS framework' })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ description: 'Course language', enum: Language, example: Language.EN })
  @IsEnum(Language)
  language: Language;

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
