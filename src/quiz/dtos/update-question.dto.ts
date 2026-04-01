import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionOptionDto } from './create-quiz.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ description: 'Question text', example: 'What is the capital of France?' })
  @IsString()
  @IsOptional()
  questionText?: string;

  @ApiPropertyOptional({
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
  @IsOptional()
  options?: CreateQuestionOptionDto[];
}
