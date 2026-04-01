import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionOptionDto } from './create-quiz.dto';

export class AddQuestionDto {
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
