import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateGradeDto {
  @ApiProperty({
    description: 'New grade score (0-100)',
    example: 90.0,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({
    description: 'Reason for grade override (minimum 10 characters)',
    example: 'Technical issue during quiz - student demonstrated knowledge in follow-up',
    minLength: 10,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'Override reason must be at least 10 characters long' })
  reason: string;
}
