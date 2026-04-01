import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AssetResponseDto } from '../dtos/asset-response.dto';
import { PaginatedAssetsDto } from '../dtos/paginated-assets.dto';
import { AssetUsageDto, ContentItemReferenceDto } from '../dtos/asset-usage.dto';
import { AssetQueryDto } from '../dtos/asset-query.dto';
import { Asset, MulterFile } from '../types/asset.types';

interface AssetFilters {
  courseId?: string;
  search?: string;
}

interface AssetWithRelations extends Asset {
  course: {
    id: string;
    title: string;
  };
}

/**
 * Asset service for file upload and management
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.10
 */
@Injectable()
export class AssetService {
  private readonly uploadBasePath = './uploads/assets';
  private readonly imageMaxSize = 5 * 1024 * 1024; // 5MB
  private readonly documentMaxSize = 20 * 1024 * 1024; // 20MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly allowedDocumentTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload asset file
   * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.10
   */
  async uploadAsset(
    file: MulterFile,
    courseId: string,
    userId: string,
  ): Promise<AssetResponseDto> {
    await this.validateCourseExists(courseId);
    await this.validateUserCanUpload(userId, courseId);
    this.validateFileType(file);
    this.validateFileSize(file);
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const coursePath = join(this.uploadBasePath, courseId);
    await this.ensureDirectoryExists(coursePath);
    const filePath = join(coursePath, uniqueFilename);
    await fs.writeFile(filePath, file.buffer);
    const asset = await (this.prisma as any).asset.create({
      data: {
        filename: uniqueFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/api/assets/${courseId}/${uniqueFilename}`,
        courseId,
        uploaderId: userId,
      },
    });
    return this.mapToAssetResponse(asset);
  }

  /**
   * Delete asset file
   * Requirements: 18.7, 18.8
   */
  async deleteAsset(assetId: string, userId: string): Promise<void> {
    const asset = await (this.prisma as any).asset.findUnique({
      where: { id: assetId },
      include: { course: true },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    await this.validateUserCanDelete(userId, asset.courseId);
    const isReferenced = await this.isAssetReferenced(assetId);
    if (isReferenced) {
      throw new BadRequestException(
        'Cannot delete asset that is referenced in course content',
      );
    }
    const filePath = this.getAssetPath(asset.courseId, asset.filename);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // File might not exist, continue with DB deletion
    }
    await (this.prisma as any).asset.delete({
      where: { id: assetId },
    });
  }

  /**
   * Get all assets with pagination and filtering
   * Requirements: 18.6, 18.7
   */
  async getAllAssets(query: AssetQueryDto): Promise<PaginatedAssetsDto> {
    const { page = 1, limit = 20, courseId, search } = query;
    const skip = (page - 1) * limit;
    const where = this.buildWhereClause({ courseId, search });
    const [assets, total] = await Promise.all([
      (this.prisma as any).asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      (this.prisma as any).asset.count({ where }),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      assets: assets.map((asset: Asset) => this.mapToAssetResponse(asset)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Search assets by filename or original name
   * Requirements: 18.6, 18.7
   */
  async searchAssets(
    query: string,
    courseId?: string,
  ): Promise<AssetResponseDto[]> {
    const where = this.buildWhereClause({ courseId, search: query });
    const assets = await (this.prisma as any).asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return assets.map((asset: Asset) => this.mapToAssetResponse(asset));
  }

  /**
   * Get asset usage details
   * Requirements: 18.11
   */
  async getAssetUsageDetails(assetId: string): Promise<AssetUsageDto> {
    const asset = await (this.prisma as any).asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    const contentItems = await this.findContentItemsUsingAsset(assetId);
    return {
      assetId,
      usageCount: contentItems.length,
      contentItems,
    };
  }

  /**
   * Update asset usage count
   * Requirements: 18.11
   */
  async updateUsageCount(assetId: string): Promise<void> {
    const usageDetails = await this.getAssetUsageDetails(assetId);
    await (this.prisma as any).asset.update({
      where: { id: assetId },
      data: { usageCount: usageDetails.usageCount },
    });
  }

  /**
   * Get asset file for serving
   * Requirements: 18.9
   */
  async getAssetFile(
    assetId: string,
  ): Promise<{ buffer: Buffer; asset: Asset }> {
    const asset = await (this.prisma as any).asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    const filePath = this.getAssetPath(asset.courseId, asset.filename);
    try {
      const buffer = await fs.readFile(filePath);
      return { buffer, asset };
    } catch (err) {
      throw new NotFoundException('Asset file not found on disk');
    }
  }

  /**
   * Get asset by ID
   * Requirements: 18.5
   */
  async getAssetById(assetId: string): Promise<AssetResponseDto> {
    const asset = await (this.prisma as any).asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return this.mapToAssetResponse(asset);
  }

  /**
   * Get assets by course
   * Requirements: 18.6, 18.10
   */
  async getAssetsByCourse(courseId: string): Promise<AssetResponseDto[]> {
    const assets = await (this.prisma as any).asset.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    return assets.map((asset: Asset) => this.mapToAssetResponse(asset));
  }

  /**
   * Build where clause for asset queries
   * Requirements: 18.6, 18.7
   */
  private buildWhereClause(filters: AssetFilters): any {
    const where: any = {};
    if (filters.courseId) {
      where.courseId = filters.courseId;
    }
    if (filters.search) {
      where.OR = [
        { filename: { contains: filters.search, mode: 'insensitive' } },
        { originalName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  /**
   * Find content items using an asset
   * Requirements: 18.11
   */
  private async findContentItemsUsingAsset(
    assetId: string,
  ): Promise<ContentItemReferenceDto[]> {
    const contentItems = await (this.prisma as any).contentItem.findMany({
      where: {
        OR: [
          { content: { contains: assetId } },
          { videoUrl: { contains: assetId } },
          { documentUrl: { contains: assetId } },
        ],
      },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });
    return contentItems.map((item: any) => ({
      id: item.id,
      title: item.title,
      moduleId: item.moduleId,
      moduleTitle: item.module.title,
      courseId: item.module.courseId,
      courseTitle: item.module.course.title,
    }));
  }

  /**
   * Validate file type
   * Requirements: 18.1, 18.2, 18.3
   */
  validateFileType(file: MulterFile): void {
    const isImage = this.allowedImageTypes.includes(file.mimetype);
    const isDocument = this.allowedDocumentTypes.includes(file.mimetype);
    if (!isImage && !isDocument) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${[...this.allowedImageTypes, ...this.allowedDocumentTypes].join(', ')}`,
      );
    }
  }

  /**
   * Validate file size
   * Requirements: 18.1, 18.2, 18.3
   */
  validateFileSize(file: MulterFile): void {
    const isImage = this.allowedImageTypes.includes(file.mimetype);
    const maxSize = isImage ? this.imageMaxSize : this.documentMaxSize;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Generate unique filename
   * Requirements: 18.4
   */
  generateUniqueFilename(originalName: string): string {
    const uuid = uuidv4();
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    return `${uuid}${extension}`;
  }

  /**
   * Get asset file path
   * Requirements: 18.10
   */
  getAssetPath(courseId: string, filename: string): string {
    return join(this.uploadBasePath, courseId, filename);
  }

  /**
   * Check if asset is referenced in content
   * Requirements: 18.8
   */
  private async isAssetReferenced(assetId: string): Promise<boolean> {
    const count = await (this.prisma as any).contentItem.count({
      where: {
        OR: [
          { content: { contains: assetId } },
          { videoUrl: { contains: assetId } },
          { documentUrl: { contains: assetId } },
        ],
      },
    });
    return count > 0;
  }

  /**
   * Validate course exists
   */
  private async validateCourseExists(courseId: string): Promise<void> {
    const course = await (this.prisma as any).course.findUnique({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
  }

  /**
   * Validate user can upload to course
   */
  private async validateUserCanUpload(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.LEARNER) {
      throw new ForbiddenException('Learners cannot upload assets');
    }
    const course = await (this.prisma as any).course.findUnique({
      where: { id: courseId },
    });
    if (user.role === UserRole.INSTRUCTOR && course.instructorId !== userId) {
      throw new ForbiddenException('You can only upload assets to your own courses');
    }
  }

  /**
   * Validate user can delete asset
   */
  private async validateUserCanDelete(
    userId: string,
    courseId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const course = await (this.prisma as any).course.findUnique({
      where: { id: courseId },
    });
    if (user.role === UserRole.INSTRUCTOR && course.instructorId !== userId) {
      throw new ForbiddenException('You can only delete assets from your own courses');
    }
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await fs.access(path);
    } catch {
      await fs.mkdir(path, { recursive: true });
    }
  }

  /**
   * Map asset to response DTO
   */
  private mapToAssetResponse(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      filename: asset.filename,
      originalName: asset.originalName,
      size: asset.size,
      mimeType: asset.mimeType,
      courseId: asset.courseId,
      uploadedBy: asset.uploaderId,
      uploadedAt: asset.createdAt,
      url: asset.url,
      usageCount: asset.usageCount,
    };
  }
}
