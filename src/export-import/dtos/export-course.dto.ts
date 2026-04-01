import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExportFormat {
  JSON = 'json',
  ZIP = 'zip',
}

export class ExportCourseDto {
  @ApiProperty({
    description: 'Export format (JSON or ZIP)',
    enum: ExportFormat,
    default: ExportFormat.JSON,
  })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.JSON;
}
