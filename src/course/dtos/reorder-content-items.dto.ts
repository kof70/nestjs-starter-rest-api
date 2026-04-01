import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderContentItemsDto {
  @ApiProperty({
    description: 'Array of content item IDs in the desired order',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  contentItemIds: string[];
}
