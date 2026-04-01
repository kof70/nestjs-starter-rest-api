import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LmsNavigationService } from '../services/lms-navigation.service';
import { ProgressService } from '../../progress/services/progress.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { LmsEnrolledCourseResponseDto } from '../dtos/lms-enrolled-course-response.dto';
import { LmsModuleNavigationResponseDto } from '../dtos/lms-module-navigation-response.dto';
import { LmsContentItemResponseDto } from '../dtos/lms-content-item-response.dto';
import { CompleteContentDto } from '../dtos/complete-content.dto';

/**
 * Controller for LMS learner navigation
 * Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.10
 */
@ApiTags('LMS - Navigation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lms')
export class LmsNavigationController {
  constructor(
    private readonly lmsNavigationService: LmsNavigationService,
    private readonly progressService: ProgressService,
  ) {}

  @Get('enrollments/my-courses')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get enrolled courses for current learner',
    description:
      'Retrieve all courses the learner is enrolled in with progress information, enrollment status, and course dates.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrolled courses retrieved successfully',
    type: [LmsEnrolledCourseResponseDto],
  })
  async getEnrolledCourses(
    @ReqContext() ctx: RequestContext,
  ): Promise<LmsEnrolledCourseResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.lmsNavigationService.getEnrolledCourses(userId);
  }

  @Get('courses/:courseId/modules')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get course modules with prerequisite locking',
    description:
      'Retrieve all modules in a course with progress tracking and prerequisite locking logic. Locked modules cannot be accessed until prerequisites are completed.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course modules retrieved successfully',
    type: [LmsModuleNavigationResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User is not enrolled in this course',
  })
  async getCourseModules(
    @Param('courseId') courseId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<LmsModuleNavigationResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.lmsNavigationService.getCourseModules(courseId, userId);
  }

  @Get('courses/:courseId/modules/:moduleId/content')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get module content items with progress tracking',
    description:
      'Retrieve all content items in a module with completion status, time spent, and content details.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module content retrieved successfully',
    type: [LmsContentItemResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User is not enrolled in this course or module does not belong to course',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async getModuleContent(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<LmsContentItemResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.lmsNavigationService.getModuleContent(
      courseId,
      moduleId,
      userId,
    );
  }

  @Post('courses/:courseId/content/:contentItemId/complete')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark content item as completed',
    description:
      'Mark a content item as completed and optionally track time spent. Updates progress at content, module, and course levels.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiParam({ name: 'contentItemId', description: 'Content Item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content marked as completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User is not enrolled in this course',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Content item not found',
  })
  async completeContent(
    @Param('courseId') courseId: string,
    @Param('contentItemId') contentItemId: string,
    @Body() dto: CompleteContentDto,
    @ReqContext() ctx: RequestContext,
  ) {
    const userId = String(ctx.user!.id);
    const timeSpent = dto.timeSpent || 0;

    const progress = await this.progressService.markContentCompleted(
      contentItemId,
      userId,
      timeSpent,
    );

    return {
      success: true,
      progress: {
        contentItemId: progress.contentItemId,
        completed: progress.completed,
        timeSpent: progress.timeSpent,
        completedAt: progress.completedAt,
      },
    };
  }
}
