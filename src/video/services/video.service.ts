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
import { createHmac } from 'crypto';
import { VideoResponseDto } from '../dtos/video-response.dto';
import { CreateVideoDto } from '../dtos/create-video.dto';
import { CreateYouTubeVideoDto } from '../dtos/create-youtube-video.dto';
import { UpdateVideoDto } from '../dtos/update-video.dto';
import { VideoStatsDto } from '../dtos/video-stats.dto';
import { VideoViewDto } from '../dtos/video-view.dto';
import { VideoQuality } from '../dtos/update-quality.dto';
import { MulterFile, Video, PresignedUrlResult } from '../types/video.types';

/**
 * Video service for video upload and metadata management
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11
 */
@Injectable()
export class VideoService {
  private readonly uploadBasePath = './uploads/videos';
  private readonly thumbnailBasePath = './uploads/thumbnails';
  private readonly videoMaxSize = 500 * 1024 * 1024; // 500MB
  private readonly thumbnailMaxSize = 2 * 1024 * 1024; // 2MB
  private readonly allowedVideoTypes = ['video/mp4', 'video/webm'];
  private readonly allowedThumbnailTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly defaultThumbnailUrl = '/assets/default-video-thumbnail.png';
  private readonly presignedUrlValidityDays = 7;
  private readonly presignedUrlSecret = process.env.PRESIGNED_URL_SECRET || 'default-secret-change-in-production';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upload video file
   * Requirements: 19.1, 19.2
   */
  async uploadVideo(
    file: MulterFile,
    dto: CreateVideoDto,
    userId: string,
  ): Promise<VideoResponseDto> {
    await this.validateContentItemExists(dto.contentItemId);
    await this.validateUserCanUpload(userId, dto.courseId);
    this.validateVideoFile(file);
    const format = this.extractFormat(file.mimetype);
    const uniqueFilename = this.generateUniqueFilename(file.originalname);
    const coursePath = join(this.uploadBasePath, dto.courseId);
    await this.ensureDirectoryExists(coursePath);
    const filePath = join(coursePath, uniqueFilename);
    await fs.writeFile(filePath, file.buffer);
    const uploadUrl = `/api/videos/files/${dto.courseId}/${uniqueFilename}`;
    const video = await this.prisma.video.create({
      data: {
        contentItemId: dto.contentItemId,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        format: dto.format || format,
        uploadUrl,
        uploaderId: userId,
      },
    });
    return this.mapToVideoResponse(video);
  }

  /**
   * Create YouTube video
   * Requirements: 19.6, 19.7
   */
  async createYouTubeVideo(
    dto: CreateYouTubeVideoDto,
    userId: string,
  ): Promise<VideoResponseDto> {
    await this.validateContentItemExists(dto.contentItemId);
    await this.validateUserCanUpload(userId, dto.courseId);
    this.validateYouTubeUrl(dto.url);
    const video = await this.prisma.video.create({
      data: {
        contentItemId: dto.contentItemId,
        title: dto.title,
        description: dto.description,
        youtubeUrl: dto.url,
        uploaderId: userId,
      },
    });
    return this.mapToVideoResponse(video);
  }

  /**
   * Update video metadata
   * Requirements: 19.5
   */
  async updateVideo(
    videoId: string,
    dto: UpdateVideoDto,
    userId: string,
  ): Promise<VideoResponseDto> {
    const video = await this.findVideoById(videoId);
    await this.validateUserCanModify(userId, video);
    const updatedVideo = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
      },
    });
    return this.mapToVideoResponse(updatedVideo);
  }

  /**
   * Delete video
   * Requirements: 19.1
   */
  async deleteVideo(videoId: string, userId: string): Promise<void> {
    const video = await this.findVideoById(videoId);
    await this.validateUserCanModify(userId, video);
    if (video.uploadUrl) {
      const contentItem = await this.prisma.contentItem.findUnique({
        where: { id: video.contentItemId },
      });
      if (contentItem) {
        const courseId = await this.getCourseIdFromContentItem(contentItem.moduleId);
        const filename = video.uploadUrl.split('/').pop();
        if (filename && courseId) {
          const filePath = this.getVideoPath(courseId, filename);
          try {
            await fs.unlink(filePath);
          } catch (err) {
            // File might not exist, continue with DB deletion
          }
        }
      }
    }
    await this.prisma.video.delete({
      where: { id: videoId },
    });
  }

  /**
   * Get video by ID
   * Requirements: 19.5
   */
  async getVideoById(videoId: string): Promise<VideoResponseDto> {
    const video = await this.findVideoById(videoId);
    return this.mapToVideoResponse(video);
  }

  /**
   * Get videos by course
   * Requirements: 19.5
   */
  async getVideosByCourse(courseId: string): Promise<VideoResponseDto[]> {
    const videos = await this.prisma.video.findMany({
      where: {
        contentItem: {
          module: {
            courseId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return videos.map((video) => this.mapToVideoResponse(video));
  }

  /**
   * Generate presigned URL
   * Requirements: 19.2
   */
  async generatePresignedUrl(videoId: string): Promise<PresignedUrlResult> {
    const video = await this.findVideoById(videoId);
    if (video.youtubeUrl) {
      return {
        url: video.youtubeUrl,
        expiresAt: new Date(Date.now() + this.presignedUrlValidityDays * 24 * 60 * 60 * 1000),
      };
    }
    if (!video.uploadUrl) {
      throw new BadRequestException('Video has no upload URL');
    }
    const expiresAt = new Date(Date.now() + this.presignedUrlValidityDays * 24 * 60 * 60 * 1000);
    const expiresAtTimestamp = Math.floor(expiresAt.getTime() / 1000);
    const signature = this.generateSignature(video.uploadUrl, expiresAtTimestamp);
    const presignedUrl = `${video.uploadUrl}?expires=${expiresAtTimestamp}&signature=${signature}`;
    return {
      url: presignedUrl,
      expiresAt,
    };
  }

  /**
   * Validate video file
   * Requirements: 19.1
   */
  validateVideoFile(file: MulterFile): void {
    if (!this.allowedVideoTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid video format. Allowed formats: ${this.allowedVideoTypes.join(', ')}`,
      );
    }
    if (file.size > this.videoMaxSize) {
      const maxSizeMB = this.videoMaxSize / (1024 * 1024);
      throw new BadRequestException(
        `Video size exceeds maximum allowed size of ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Validate YouTube URL
   * Requirements: 19.7
   */
  validateYouTubeUrl(url: string): void {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(url)) {
      throw new BadRequestException(
        'Invalid YouTube URL format. Expected format: youtube.com/watch?v= or youtu.be/',
      );
    }
  }

  /**
   * Find video by ID
   */
  private async findVideoById(videoId: string): Promise<any> {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    return video;
  }

  /**
   * Validate content item exists
   */
  private async validateContentItemExists(contentItemId: string): Promise<void> {
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
    });
    if (!contentItem) {
      throw new NotFoundException('Content item not found');
    }
  }

  /**
   * Validate user can upload
   */
  private async validateUserCanUpload(userId: string, courseId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.LEARNER) {
      throw new ForbiddenException('Learners cannot upload videos');
    }
    if (user.role === UserRole.INSTRUCTOR) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        throw new NotFoundException('Course not found');
      }
      if (course.ownerId !== userId) {
        throw new ForbiddenException('You can only upload videos to your own courses');
      }
    }
  }

  /**
   * Validate user can modify video
   */
  private async validateUserCanModify(userId: string, video: any): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === UserRole.ADMIN) {
      return;
    }
    if (video.uploaderId !== userId) {
      throw new ForbiddenException('You can only modify your own videos');
    }
  }

  /**
   * Generate unique filename
   */
  private generateUniqueFilename(originalName: string): string {
    const uuid = uuidv4();
    const extension = originalName.substring(originalName.lastIndexOf('.'));
    return `${uuid}${extension}`;
  }

  /**
   * Extract format from mimetype
   */
  private extractFormat(mimetype: string): string {
    const formatMap: Record<string, string> = {
      'video/mp4': 'MP4',
      'video/webm': 'WebM',
    };
    return formatMap[mimetype] || 'Unknown';
  }

  /**
   * Get video file path
   */
  private getVideoPath(courseId: string, filename: string): string {
    return join(this.uploadBasePath, courseId, filename);
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
   * Generate signature for presigned URL
   */
  private generateSignature(url: string, expiresAt: number): string {
    const data = `${url}:${expiresAt}`;
    return createHmac('sha256', this.presignedUrlSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Map video to response DTO
   */
  private mapToVideoResponse(video: Video): VideoResponseDto {
    const isYouTube = !!video.youtubeUrl;
    const url = isYouTube ? video.youtubeUrl! : video.uploadUrl!;
    return {
      id: video.id,
      title: video.title,
      description: video.description || undefined,
      duration: video.duration || undefined,
      format: video.format || undefined,
      url,
      contentItemId: video.contentItemId,
      uploadedBy: video.uploaderId,
      uploadedAt: video.createdAt,
      isYouTube,
      thumbnailUrl: video.thumbnailUrl || this.defaultThumbnailUrl,
    };
  }

  /**
   * Upload thumbnail for video
   * Requirements: 19.3, 19.4
   */
  async uploadThumbnail(
    videoId: string,
    file: MulterFile,
    userId: string,
  ): Promise<VideoResponseDto> {
    const video = await this.findVideoById(videoId);
    await this.validateUserCanModify(userId, video);
    this.validateThumbnailFile(file);
    const extension = this.extractExtension(file.originalname);
    const thumbnailPath = join(this.thumbnailBasePath, videoId);
    await this.ensureDirectoryExists(thumbnailPath);
    const filename = `thumbnail${extension}`;
    const filePath = join(thumbnailPath, filename);
    await fs.writeFile(filePath, file.buffer);
    const thumbnailUrl = `/api/videos/${videoId}/thumbnail`;
    const updatedVideo = await this.prisma.video.update({
      where: { id: videoId },
      data: { thumbnailUrl },
    });
    return this.mapToVideoResponse(updatedVideo);
  }

  /**
   * Get thumbnail URL or default
   * Requirements: 19.4
   */
  async getThumbnailUrl(videoId: string): Promise<string> {
    const video = await this.findVideoById(videoId);
    return video.thumbnailUrl || this.defaultThumbnailUrl;
  }

  /**
   * Get default thumbnail URL
   * Requirements: 19.4
   */
  getDefaultThumbnail(): string {
    return this.defaultThumbnailUrl;
  }

  /**
   * Track video view
   * Requirements: 19.8
   */
  async trackVideoView(videoId: string, userId: string): Promise<VideoViewDto> {
    await this.findVideoById(videoId);
    const videoView = await this.prisma.videoView.create({
      data: {
        videoId,
        userId,
      },
    });
    return {
      videoId: videoView.videoId,
      userId: videoView.userId,
      viewedAt: videoView.viewedAt,
    };
  }

  /**
   * Get video view statistics
   * Requirements: 19.8
   */
  async getVideoViews(videoId: string): Promise<VideoStatsDto> {
    await this.findVideoById(videoId);
    const totalViews = await this.prisma.videoView.count({
      where: { videoId },
    });
    const uniqueViewers = await this.prisma.videoView.findMany({
      where: { videoId },
      distinct: ['userId'],
      select: { userId: true },
    });
    return {
      videoId,
      totalViews,
      uniqueViewers: uniqueViewers.length,
    };
  }

  /**
   * Get user's view count for a video
   * Requirements: 19.8
   */
  async getUserVideoViews(videoId: string, userId: string): Promise<number> {
    await this.findVideoById(videoId);
    return this.prisma.videoView.count({
      where: {
        videoId,
        userId,
      },
    });
  }

  /**
   * Update video quality
   * Requirements: 19.10, 19.11
   */
  async updateVideoQuality(
    videoId: string,
    quality: VideoQuality,
    userId: string,
  ): Promise<VideoResponseDto> {
    const video = await this.findVideoById(videoId);
    await this.validateUserCanModify(userId, video);
    const updatedVideo = await this.prisma.video.update({
      where: { id: videoId },
      data: { format: quality },
    });
    return this.mapToVideoResponse(updatedVideo);
  }

  /**
   * Validate thumbnail file
   * Requirements: 19.3
   */
  private validateThumbnailFile(file: MulterFile): void {
    if (!this.allowedThumbnailTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid thumbnail format. Allowed formats: JPEG, PNG, WebP`,
      );
    }
    if (file.size > this.thumbnailMaxSize) {
      const maxSizeMB = this.thumbnailMaxSize / (1024 * 1024);
      throw new BadRequestException(
        `Thumbnail size exceeds maximum allowed size of ${maxSizeMB}MB`,
      );
    }
  }

  /**
   * Extract file extension
   */
  private extractExtension(filename: string): string {
    return filename.substring(filename.lastIndexOf('.'));
  }

  /**
   * Get course ID from module ID
   */
  private async getCourseIdFromContentItem(moduleId: string): Promise<string | null> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });
    return module?.courseId || null;
  }
}
