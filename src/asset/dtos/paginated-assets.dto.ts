import { ApiProperty } from '@nestjs/swagger';
import { AssetResponseDto } from './asset-response.dto';

/**
 * DTO for paginated asset results
 * Requirements: 18.6
 */
export class PaginatedAssetsDto {
  @ApiProperty({
    description: 'Array of assets',
    type: [AssetResponseDto],
  })
  assets: AssetResponseDto[];

  @ApiProperty({
    description: 'Total number of assets',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}
