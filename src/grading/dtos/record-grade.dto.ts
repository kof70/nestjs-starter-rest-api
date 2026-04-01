import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class RecordGradeDto {
  @ApiProperty({
    description: 'Content item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty()
  @IsUUID()
  contentItemId: string;

  @ApiProperty({
    description: 'Grade score (0-100)',
    example: 85.5,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({
    description: 'Weight for weighted grading',
    example: 1.0,
    minimum: 0,
    default: 1.0,
  })
  @IsNumber()
  @Min(0)
  weight: number = 1.0;
}
