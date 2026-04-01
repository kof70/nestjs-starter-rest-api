import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { AssetService } from '../services/asset.service';
import { AssetResponseDto } from '../dtos/asset-response.dto';
import { PaginatedAssetsDto } from '../dtos/paginated-assets.dto';
import { AssetUsageDto } from '../dtos/asset-usage.dto';
import { AssetQueryDto } from '../dtos/asset-query.dto';
import { UploadAssetDto } from '../dtos/upload-asset.dto';
import { MulterFile } from '../types/asset.types';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

/**
 * Asset controller for file upload and management
 * Requirements: 18.1, 18.2, 18.6, 18.7, 18.9, 18.11
 */
@ApiTags('assets')
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * Upload asset file
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload asset file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Asset file to upload',
        },
        courseId: {
          type: 'string',
          format: 'uuid',
          description: 'Course ID to associate the asset with',
        },
      },
      required: ['file', 'courseId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Asset uploaded successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or course ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async uploadAsset(
    @UploadedFile() file: MulterFile,
    @Body() uploadAssetDto: UploadAssetDto,
    @Request() req: RequestWithUser,
  ): Promise<AssetResponseDto> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.assetService.uploadAsset(
      file,
      uploadAssetDto.courseId,
      req.user.id,
    );
  }

  /**
   * Get all assets with pagination and filtering
   * Requirements: 18.6, 18.7
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all assets with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Assets retrieved successfully',
    type: PaginatedAssetsDto,
  })
  async getAllAssets(@Query() query: AssetQueryDto): Promise<PaginatedAssetsDto> {
    return this.assetService.getAllAssets(query);
  }

  /**
   * Search assets
   * Requirements: 18.6, 18.7
   */
  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search assets by filename or original name' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [AssetResponseDto],
  })
  async searchAssets(
    @Query('q') query: string,
    @Query('courseId') courseId?: string,
  ): Promise<AssetResponseDto[]> {
    if (!query) {
      throw new BadRequestException('Search query is required');
    }
    return this.assetService.searchAssets(query, courseId);
  }

  /**
   * Get asset by ID
   * Requirements: 18.5
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get asset by ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset retrieved successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetById(@Param('id') assetId: string): Promise<AssetResponseDto> {
    return this.assetService.getAssetById(assetId);
  }

  /**
   * Get asset usage details
   * Requirements: 18.11
   */
  @Get(':id/usage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get asset usage details' })
  @ApiResponse({
    status: 200,
    description: 'Asset usage details retrieved successfully',
    type: AssetUsageDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async getAssetUsage(@Param('id') assetId: string): Promise<AssetUsageDto> {
    return this.assetService.getAssetUsageDetails(assetId);
  }

  /**
   * Download/serve asset file with caching headers
   * Requirements: 18.9
   */
  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download asset file' })
  @ApiResponse({
    status: 200,
    description: 'Asset file served successfully',
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async downloadAsset(
    @Param('id') assetId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, asset } = await this.assetService.getAssetFile(assetId);
    res.set({
      'Content-Type': asset.mimeType,
      'Content-Disposition': `attachment; filename="${asset.originalName}"`,
      'Cache-Control': 'max-age=86400', // 24 hours
      'Content-Length': asset.size,
    });
    return new StreamableFile(buffer);
  }

  /**
   * Get assets by course
   * Requirements: 18.6, 18.10
   */
  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all assets for a course' })
  @ApiResponse({
    status: 200,
    description: 'Assets retrieved successfully',
    type: [AssetResponseDto],
  })
  async getAssetsByCourse(
    @Param('courseId') courseId: string,
  ): Promise<AssetResponseDto[]> {
    return this.assetService.getAssetsByCourse(courseId);
  }

  /**
   * Delete asset
   * Requirements: 18.7, 18.8
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete asset' })
  @ApiResponse({ status: 204, description: 'Asset deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Asset is referenced in course content',
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteAsset(
    @Param('id') assetId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.assetService.deleteAsset(assetId, req.user.id);
  }
}
