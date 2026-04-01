import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateQuizDto {
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
}
