import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for uploading an asset
 * Requirements: 18.1, 18.2, 18.10
 */
export class UploadAssetDto {
  @ApiProperty({
    description: 'Course ID to associate the asset with',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
