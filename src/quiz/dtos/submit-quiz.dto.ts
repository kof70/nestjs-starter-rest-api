import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Quiz answers as a map of questionId to selected optionId',
    example: {
      'question-uuid-1': 'option-uuid-1',
      'question-uuid-2': 'option-uuid-2',
    },
  })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string>;
}
