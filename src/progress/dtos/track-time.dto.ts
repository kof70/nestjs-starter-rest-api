import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for tracking time spent on content
 * Requirements: 6.5
 */
export class TrackTimeDto {
  @ApiProperty({
    description: 'Time spent in seconds',
    example: 120,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  timeSpent: number;
}
