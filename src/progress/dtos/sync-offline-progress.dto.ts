import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for a single offline progress item
 */
export class OfflineProgressItemDto {
  @ApiProperty({
    description: 'Content item UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  contentItemId: string;

  @ApiProperty({
    description: 'Time spent on content in seconds',
    example: 300,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  timeSpent: number;

  @ApiProperty({
    description: 'Whether the content was completed',
    example: true,
  })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({
    description: 'Timestamp when the progress was recorded offline',
    example: '2024-01-15T10:30:00Z',
  })
  @IsDateString()
  timestamp: string;
}

/**
 * DTO for syncing offline progress data
 * Requirements: 6.7, 10.5
 */
export class SyncOfflineProgressDto {
  @ApiProperty({
    description: 'Array of offline progress items to sync',
    type: [OfflineProgressItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineProgressItemDto)
  progressData: OfflineProgressItemDto[];
}

/**
 * Response DTO for offline progress sync
 */
export interface SyncOfflineProgressResponseDto {
  synced: number;
  failed: number;
  errors: string[];
}
