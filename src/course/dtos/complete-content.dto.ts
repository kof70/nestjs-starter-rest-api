import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for marking content as completed
 * Requirements: 5.4, 6.1, 6.5
 */
export class CompleteContentDto {
  @ApiPropertyOptional({
    description: 'Time spent on this content item in seconds',
    example: 300,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;
}
