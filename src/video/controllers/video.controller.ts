import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { VideoService } from '../services/video.service';
import { VideoResponseDto } from '../dtos/video-response.dto';
import { CreateVideoDto } from '../dtos/create-video.dto';
import { CreateYouTubeVideoDto } from '../dtos/create-youtube-video.dto';
import { UpdateVideoDto } from '../dtos/update-video.dto';
import { VideoStatsDto } from '../dtos/video-stats.dto';
import { VideoViewDto } from '../dtos/video-view.dto';
import { UpdateQualityDto } from '../dtos/update-quality.dto';
import { MulterFile, PresignedUrlResult } from '../types/video.types';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

/**
 * Video controller for video upload and metadata management
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9, 19.10, 19.11
 */
@ApiTags('videos')
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  /**
   * Upload video file
   * Requirements: 19.1, 19.2
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file to upload (MP4 or WebM, max 500MB)',
        },
        title: {
          type: 'string',
          description: 'Video title',
        },
        description: {
          type: 'string',
          description: 'Video description',
        },
        courseId: {
          type: 'string',
          format: 'uuid',
          description: 'Course ID',
        },
        contentItemId: {
          type: 'string',
          format: 'uuid',
          description: 'Content item ID',
        },
        duration: {
          type: 'number',
          description: 'Video duration in seconds',
        },
        format: {
          type: 'string',
          description: 'Video format',
        },
      },
      required: ['file', 'title', 'courseId', 'contentItemId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async uploadVideo(
    @UploadedFile() file: MulterFile,
    @Body() createVideoDto: CreateVideoDto,
    @Request() req: RequestWithUser,
  ): Promise<VideoResponseDto> {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }
    return this.videoService.uploadVideo(file, createVideoDto, req.user.id);
  }

  /**
   * Add YouTube video
   * Requirements: 19.6, 19.7
   */
  @Post('youtube')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add YouTube video' })
  @ApiResponse({
    status: 201,
    description: 'YouTube video added successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid YouTube URL' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createYouTubeVideo(
    @Body() createYouTubeVideoDto: CreateYouTubeVideoDto,
    @Request() req: RequestWithUser,
  ): Promise<VideoResponseDto> {
    return this.videoService.createYouTubeVideo(createYouTubeVideoDto, req.user.id);
  }

  /**
   * Get video metadata
   * Requirements: 19.5
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video metadata' })
  @ApiResponse({
    status: 200,
    description: 'Video metadata retrieved successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoById(@Param('id') videoId: string): Promise<VideoResponseDto> {
    return this.videoService.getVideoById(videoId);
  }

  /**
   * Get presigned URL
   * Requirements: 19.2
   */
  @Get(':id/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get presigned URL for video (valid for 7 days)' })
  @ApiResponse({
    status: 200,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Presigned URL',
        },
        expiresAt: {
          type: 'string',
          format: 'date-time',
          description: 'Expiration timestamp',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getPresignedUrl(@Param('id') videoId: string): Promise<PresignedUrlResult> {
    return this.videoService.generatePresignedUrl(videoId);
  }

  /**
   * List course videos
   * Requirements: 19.5
   */
  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all videos for a course' })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
    type: [VideoResponseDto],
  })
  async getVideosByCourse(
    @Param('courseId') courseId: string,
  ): Promise<VideoResponseDto[]> {
    return this.videoService.getVideosByCourse(courseId);
  }

  /**
   * Update video metadata
   * Requirements: 19.5
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update video metadata' })
  @ApiResponse({
    status: 200,
    description: 'Video updated successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateVideo(
    @Param('id') videoId: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Request() req: RequestWithUser,
  ): Promise<VideoResponseDto> {
    return this.videoService.updateVideo(videoId, updateVideoDto, req.user.id);
  }

  /**
   * Delete video
   * Requirements: 19.1
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete video' })
  @ApiResponse({ status: 204, description: 'Video deleted successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteVideo(
    @Param('id') videoId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.videoService.deleteVideo(videoId, req.user.id);
  }

  /**
   * Upload video thumbnail
   * Requirements: 19.3, 19.4
   */
  @Post(':id/thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload video thumbnail' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image (JPEG, PNG, WebP, max 2MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail uploaded successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async uploadThumbnail(
    @Param('id') videoId: string,
    @UploadedFile() file: MulterFile,
    @Request() req: RequestWithUser,
  ): Promise<VideoResponseDto> {
    if (!file) {
      throw new BadRequestException('Thumbnail file is required');
    }
    return this.videoService.uploadThumbnail(videoId, file, req.user.id);
  }

  /**
   * Get video thumbnail
   * Requirements: 19.4
   */
  @Get(':id/thumbnail')
  @ApiOperation({ summary: 'Get video thumbnail URL (or default)' })
  @ApiResponse({
    status: 200,
    description: 'Thumbnail URL retrieved',
    schema: {
      type: 'object',
      properties: {
        thumbnailUrl: {
          type: 'string',
          description: 'Thumbnail URL',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getThumbnail(
    @Param('id') videoId: string,
  ): Promise<{ thumbnailUrl: string }> {
    const thumbnailUrl = await this.videoService.getThumbnailUrl(videoId);
    return { thumbnailUrl };
  }

  /**
   * Track video view
   * Requirements: 19.8
   */
  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track video view' })
  @ApiResponse({
    status: 201,
    description: 'Video view tracked successfully',
    type: VideoViewDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async trackView(
    @Param('id') videoId: string,
    @Request() req: RequestWithUser,
  ): Promise<VideoViewDto> {
    return this.videoService.trackVideoView(videoId, req.user.id);
  }

  /**
   * Get video view statistics
   * Requirements: 19.8
   */
  @Get(':id/views')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get video view statistics' })
  @ApiResponse({
    status: 200,
    description: 'Video statistics retrieved',
    type: VideoStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async getVideoViews(@Param('id') videoId: string): Promise<VideoStatsDto> {
    return this.videoService.getVideoViews(videoId);
  }

  /**
   * Update video quality
   * Requirements: 19.10, 19.11
   */
  @Patch(':id/quality')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update video quality preference' })
  @ApiResponse({
    status: 200,
    description: 'Video quality updated',
    type: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateQuality(
    @Param('id') videoId: string,
    @Body() updateQualityDto: UpdateQualityDto,
    @Request() req: RequestWithUser,
  ): Promise<VideoResponseDto> {
    return this.videoService.updateVideoQuality(
      videoId,
      updateQualityDto.quality,
      req.user.id,
    );
  }
}
