import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProgressService } from '../services/progress.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import {
  ContentProgressResponseDto,
  ModuleProgressResponseDto,
  CourseProgressResponseDto,
  ProgressDashboardResponseDto,
} from '../dtos/progress-response.dto';
import {
  SyncOfflineProgressDto,
  SyncOfflineProgressResponseDto,
} from '../dtos/sync-offline-progress.dto';
import { TrackTimeDto } from '../dtos/track-time.dto';

export type ProgressAuthedRequest = Request & {
  user: { userId: string };
};

/**
 * Progress controller for learner progress tracking
 * Requirements: 6.4, 6.5, 6.6, 6.7, 10.4, 10.5
 */
@ApiTags('Progress')
@ApiBearerAuth()
@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * Get progress dashboard showing all enrolled courses
   * Requirements: 6.4, 6.6
   */
  @Get('dashboard')
  @Roles(UserRole.LEARNER)
  @ApiOperation({
    summary: 'Get progress dashboard',
    description:
      'Returns progress dashboard with all enrolled courses, completion percentages, and estimated time remaining',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress dashboard retrieved successfully',
  })
  async getProgressDashboard(
    @Req() req: ProgressAuthedRequest,
  ): Promise<ProgressDashboardResponseDto[]> {
    return this.progressService.getProgressDashboard(req.user.userId);
  }

  /**
   * Get progress for a specific content item
   * Requirements: 6.4
   */
  @Get('content/:contentItemId')
  @Roles(UserRole.LEARNER)
  @ApiOperation({
    summary: 'Get content item progress',
    description: 'Returns progress for a specific content item',
  })
  @ApiParam({
    name: 'contentItemId',
    description: 'Content item UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Content progress retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Content item not found',
  })
  async getContentProgress(
    @Param('contentItemId') contentItemId: string,
    @Req() req: ProgressAuthedRequest,
  ): Promise<ContentProgressResponseDto> {
    return this.progressService.getContentProgress(
      contentItemId,
      req.user.userId,
    );
  }

  /**
   * Get progress for a specific module
   * Requirements: 6.4
   */
  @Get('module/:moduleId')
  @Roles(UserRole.LEARNER)
  @ApiOperation({
    summary: 'Get module progress',
    description:
      'Returns progress for a specific module including completion percentage',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Module progress retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async getModuleProgress(
    @Param('moduleId') moduleId: string,
    @Req() req: ProgressAuthedRequest,
  ): Promise<ModuleProgressResponseDto> {
    return this.progressService.getModuleProgress(moduleId, req.user.userId);
  }

  /**
   * Get progress for a specific course
   * Requirements: 6.4
   */
  @Get('course/:courseId')
  @Roles(UserRole.LEARNER)
  @ApiOperation({
    summary: 'Get course progress',
    description:
      'Returns progress for a specific course including completion percentage',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Course progress retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseProgress(
    @Param('courseId') courseId: string,
    @Req() req: ProgressAuthedRequest,
  ): Promise<CourseProgressResponseDto> {
    return this.progressService.getCourseProgress(courseId, req.user.userId);
  }

  /**
   * Mark content item as completed
   * Requirements: 6.1
   */
  @Post('content/:contentItemId/complete')
  @Roles(UserRole.LEARNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark content as completed',
    description: 'Marks a content item as completed and updates progress',
  })
  @ApiParam({
    name: 'contentItemId',
    description: 'Content item UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Content marked as completed',
  })
  @ApiResponse({
    status: 400,
    description: 'User not enrolled in course',
  })
  @ApiResponse({
    status: 404,
    description: 'Content item not found',
  })
  async markContentCompleted(
    @Param('contentItemId') contentItemId: string,
    @Body() trackTimeDto: TrackTimeDto,
    @Req() req: ProgressAuthedRequest,
  ) {
    return this.progressService.markContentCompleted(
      contentItemId,
      req.user.userId,
      trackTimeDto.timeSpent,
    );
  }

  /**
   * Track time spent on content
   * Requirements: 6.5
   */
  @Post('content/:contentItemId/time')
  @Roles(UserRole.LEARNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track time spent',
    description: 'Records time spent on a content item',
  })
  @ApiParam({
    name: 'contentItemId',
    description: 'Content item UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Time tracked successfully',
  })
  async trackTimeSpent(
    @Param('contentItemId') contentItemId: string,
    @Body() trackTimeDto: TrackTimeDto,
    @Req() req: ProgressAuthedRequest,
  ) {
    return this.progressService.trackTimeSpent(
      contentItemId,
      req.user.userId,
      trackTimeDto.timeSpent,
    );
  }

  /**
   * Sync offline progress data
   * Requirements: 6.7, 10.4, 10.5
   */
  @Post('sync')
  @Roles(UserRole.LEARNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync offline progress',
    description:
      'Syncs progress data collected offline when connectivity is restored',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress synced successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid progress data',
  })
  async syncOfflineProgress(
    @Body() syncDto: SyncOfflineProgressDto,
    @Req() req: ProgressAuthedRequest,
  ): Promise<SyncOfflineProgressResponseDto> {
    const progressData = syncDto.progressData.map((item) => ({
      contentItemId: item.contentItemId,
      timeSpent: item.timeSpent,
      completed: item.completed,
      timestamp: new Date(item.timestamp),
    }));
    return this.progressService.syncOfflineProgress(
      req.user.userId,
      progressData,
    );
  }
}
