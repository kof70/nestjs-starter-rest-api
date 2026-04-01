import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateQuestionOptionDto {
  @ApiProperty({ description: 'Option text', example: 'Paris' })
  @IsString()
  @IsNotEmpty()
  optionText: string;

  @ApiProperty({ description: 'Whether this option is correct', example: true })
  @IsNotEmpty()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text', example: 'What is the capital of France?' })
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @ApiProperty({
    description: 'Question options (2-6 options)',
    type: [CreateQuestionOptionDto],
    example: [
      { optionText: 'Paris', isCorrect: true },
      { optionText: 'London', isCorrect: false },
      { optionText: 'Berlin', isCorrect: false },
    ],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options: CreateQuestionOptionDto[];
}

export class CreateQuizDto {
  @ApiProperty({ description: 'Content item ID to attach quiz to' })
  @IsString()
  @IsNotEmpty()
  contentItemId: string;

  @ApiPropertyOptional({
    description: 'Passing score percentage',
    example: 70,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  passingScore?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of attempts',
    example: 3,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxAttempts?: number;

  @ApiProperty({
    description: 'Quiz questions',
    type: [CreateQuestionDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
