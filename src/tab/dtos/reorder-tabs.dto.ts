import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

/**
 * DTO for reordering tabs
 * Requirements: 20.4
 */
export class ReorderTabsDto {
  @ApiProperty({
    description: 'Array of tab IDs in desired order',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
      '123e4567-e89b-12d3-a456-426614174002',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  tabIds: string[];
}
