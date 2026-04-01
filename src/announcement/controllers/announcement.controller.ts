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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { AnnouncementService } from '../services/announcement.service';
import { CreateAnnouncementDto } from '../dtos/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dtos/update-announcement.dto';
import { AnnouncementResponseDto } from '../dtos/announcement-response.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

/**
 * Announcement controller for course announcement management
 * Requirements: 21.1, 21.2, 21.4, 21.5, 21.6, 21.7
 */
@ApiTags('announcements')
@Controller()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  /**
   * Create a new announcement (CMS)
   * Requirements: 21.1, 21.2
   */
  @Post('cms/courses/:courseId/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course announcement' })
  @ApiResponse({
    status: 201,
    description: 'Announcement created successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid announcement data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async createAnnouncement(
    @Param('courseId') courseId: string,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @Request() req: RequestWithUser,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementService.createAnnouncement(
      courseId,
      createAnnouncementDto,
      req.user.id,
    );
  }

  /**
   * Get all announcements for a course (CMS - includes deleted)
   * Requirements: 21.4, 21.8
   */
  @Get('cms/courses/:courseId/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all announcements for a course (including deleted)',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
    type: [AnnouncementResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseAnnouncementsCms(
    @Param('courseId') courseId: string,
  ): Promise<AnnouncementResponseDto[]> {
    return this.announcementService.getCourseAnnouncementsCms(courseId);
  }

  /**
   * Get visible announcements for learners (LMS - excludes deleted)
   * Requirements: 21.4, 21.5, 21.8
   */
  @Get('lms/courses/:courseId/announcements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get visible announcements for enrolled learners',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
    type: [AnnouncementResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseAnnouncementsLms(
    @Param('courseId') courseId: string,
    @Request() req: RequestWithUser,
  ): Promise<AnnouncementResponseDto[]> {
    return this.announcementService.getCourseAnnouncementsLms(
      courseId,
      req.user.id,
    );
  }

  /**
   * Get announcement by ID
   * Requirements: 21.1
   */
  @Get('announcements/:announcementId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get announcement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Announcement retrieved successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async getAnnouncementById(
    @Param('announcementId') announcementId: string,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementService.getAnnouncementById(announcementId);
  }

  /**
   * Update announcement
   * Requirements: 21.6
   */
  @Patch('cms/announcements/:announcementId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update announcement' })
  @ApiResponse({
    status: 200,
    description: 'Announcement updated successfully',
    type: AnnouncementResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid announcement data' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async updateAnnouncement(
    @Param('announcementId') announcementId: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @Request() req: RequestWithUser,
  ): Promise<AnnouncementResponseDto> {
    return this.announcementService.updateAnnouncement(
      announcementId,
      updateAnnouncementDto,
      req.user.id,
    );
  }

  /**
   * Soft delete announcement
   * Requirements: 21.7
   */
  @Delete('cms/announcements/:announcementId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete announcement' })
  @ApiResponse({ status: 204, description: 'Announcement deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async deleteAnnouncement(
    @Param('announcementId') announcementId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.announcementService.deleteAnnouncement(
      announcementId,
      req.user.id,
    );
  }

  /**
   * Mark announcement as read
   * Requirements: 21.11
   */
  @Post('lms/announcements/:announcementId/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark announcement as read' })
  @ApiResponse({ status: 204, description: 'Announcement marked as read' })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Announcement not found' })
  async markAnnouncementAsRead(
    @Param('announcementId') announcementId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.announcementService.markAnnouncementAsRead(
      announcementId,
      req.user.id,
    );
  }

  /**
   * Get unread announcement count for a course
   * Requirements: 21.11
   */
  @Get('lms/courses/:courseId/announcements/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread announcement count for a course' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Not enrolled in course' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getUnreadAnnouncementCount(
    @Param('courseId') courseId: string,
    @Request() req: RequestWithUser,
  ): Promise<{ count: number }> {
    const count = await this.announcementService.getUnreadAnnouncementCount(
      courseId,
      req.user.id,
    );
    return { count };
  }
}
