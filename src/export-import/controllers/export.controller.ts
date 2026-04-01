import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UserRole } from '@prisma/client';
import { ExportService } from '../services/export.service';
import { ImportService } from '../services/import.service';
import { ExportCourseDto, ExportFormat } from '../dtos/export-course.dto';
import { ImportCourseDto, ImportResult } from '../dtos/import-course.dto';

/**
 * Export controller for course backup and migration
 * Requirements: 16.1, 16.2, 16.3, 16.4
 */
@ApiTags('Export')
@Controller('cms/courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly importService: ImportService,
  ) {}

  /**
   * Export course to JSON or ZIP format
   * Requirements: 16.1, 16.2, 16.3, 16.4
   */
  @Get(':id/export')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export course to JSON or ZIP format' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course exported successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to export this course',
  })
  async exportCourse(
    @Param('id') courseId: string,
    @Query() query: ExportCourseDto,
    @ReqContext() ctx: RequestContext,
    @Res() res: Response,
  ): Promise<void> {
    const user = ctx.user!;
    const format = query.format || ExportFormat.JSON;
    const result = await this.exportService.exportCourse(
      courseId,
      String(user.id),
      user.role as UserRole,
      format,
    );

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.data.length);
    res.send(result.data);
  }

  /**
   * Import course from JSON file
   * Requirements: 16.5, 16.6, 16.7, 16.8
   */
  @Post('import')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Import course from JSON file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course imported successfully',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file structure or validation errors',
  })
  async importCourse(
    @Body() dto: ImportCourseDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ImportResult> {
    const raw = dto.data.trim();
    const base64Pattern =
      /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    if (raw.length === 0 || !base64Pattern.test(raw)) {
      return {
        success: false,
        errors: [
          {
            field: 'data',
            message: 'Invalid base64 encoding',
            code: 'INVALID_BASE64',
          },
        ],
        warnings: [],
      };
    }

    // Decode base64 data
    let jsonData: string;
    try {
      jsonData = Buffer.from(raw, 'base64').toString('utf-8');
    } catch (error) {
      return {
        success: false,
        errors: [
          {
            field: 'data',
            message: 'Invalid base64 encoding',
            code: 'INVALID_BASE64',
          },
        ],
        warnings: [],
      };
    }

    return this.importService.importCourse(jsonData, String(ctx.user!.id));
  }
}
