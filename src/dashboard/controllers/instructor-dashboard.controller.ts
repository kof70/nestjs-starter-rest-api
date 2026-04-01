import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  Request,
  Header,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { InstructorDashboardService } from '../services/instructor-dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { EnrollmentStatisticsDto } from '../dtos/enrollment-statistics.dto';
import { LearnerProgressSummaryDto } from '../dtos/learner-progress-summary.dto';
import { QuizPerformanceDto } from '../dtos/quiz-performance.dto';
import { AverageTimePerModuleDto } from '../dtos/average-time-per-module.dto';
import {
  FilteredLearnersDto,
  FilterLearnersQueryDto,
  ProgressStatusFilter,
} from '../dtos/filtered-learners.dto';
import { StrugglingLearnersDto } from '../dtos/struggling-learner.dto';
import { BulkEmailDto, BulkEmailResponseDto } from '../dtos/bulk-email.dto';

/**
 * Controller for instructor dashboard analytics
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8
 */
@ApiTags('Instructor Dashboard')
@ApiBearerAuth()
@Controller('instructor/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class InstructorDashboardController {
  constructor(
    private readonly dashboardService: InstructorDashboardService,
  ) {}

  /**
   * Get enrollment statistics for a course
   * Requirements: 14.1
   */
  @Get('courses/:courseId/enrollment-statistics')
  @ApiOperation({
    summary: 'Get enrollment statistics for a course',
    description:
      'Returns enrollment counts by status (active, completed, inactive) and completion rate',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment statistics retrieved successfully',
    type: EnrollmentStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getEnrollmentStatistics(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<EnrollmentStatisticsDto> {
    return this.dashboardService.getEnrollmentStatistics(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Get learner progress summary for a course
   * Requirements: 14.2
   */
  @Get('courses/:courseId/learner-progress')
  @ApiOperation({
    summary: 'Get learner progress summary for a course',
    description:
      'Returns progress data for all enrolled learners with completion percentages',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learner progress summary retrieved successfully',
    type: LearnerProgressSummaryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getLearnerProgressSummary(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<LearnerProgressSummaryDto> {
    return this.dashboardService.getLearnerProgressSummary(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Get quiz performance data for all learners
   * Requirements: 14.3
   */
  @Get('courses/:courseId/quiz-performance')
  @ApiOperation({
    summary: 'Get quiz performance data for all learners in a course',
    description:
      'Returns quiz scores and attempts for all learners with average statistics',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz performance data retrieved successfully',
    type: QuizPerformanceDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getQuizPerformance(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<QuizPerformanceDto> {
    return this.dashboardService.getQuizPerformance(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Get average time spent per module
   * Requirements: 14.6
   */
  @Get('courses/:courseId/average-time-per-module')
  @ApiOperation({
    summary: 'Get average time spent per module',
    description:
      'Returns average time spent by learners on each module in the course',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Average time per module retrieved successfully',
    type: AverageTimePerModuleDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getAverageTimePerModule(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<AverageTimePerModuleDto> {
    return this.dashboardService.getAverageTimePerModule(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Get filtered learners by progress status
   * Requirements: 14.4
   */
  @Get('courses/:courseId/learners')
  @ApiOperation({
    summary: 'Get filtered learners by progress status',
    description:
      'Returns learners filtered by progress status (not started, in progress, completed)',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiQuery({
    name: 'status',
    enum: ProgressStatusFilter,
    required: false,
    description: 'Filter by progress status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filtered learners retrieved successfully',
    type: FilteredLearnersDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getFilteredLearners(
    @Param('courseId') courseId: string,
    @Query() query: FilterLearnersQueryDto,
    @Request() req: any,
  ): Promise<FilteredLearnersDto> {
    return this.dashboardService.getFilteredLearners(
      courseId,
      req.user.id,
      req.user.role,
      query.status || ProgressStatusFilter.ALL,
    );
  }

  /**
   * Get struggling learners
   * Requirements: 14.7
   */
  @Get('courses/:courseId/struggling-learners')
  @ApiOperation({
    summary: 'Get struggling learners',
    description:
      'Returns learners who are struggling based on low quiz scores, inactivity, or low completion',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Struggling learners retrieved successfully',
    type: StrugglingLearnersDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async getStrugglingLearners(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<StrugglingLearnersDto> {
    return this.dashboardService.getStrugglingLearners(
      courseId,
      req.user.id,
      req.user.role,
    );
  }

  /**
   * Export learners to CSV
   * Requirements: 14.5
   */
  @Get('courses/:courseId/export-learners')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="learners.csv"')
  @ApiOperation({
    summary: 'Export learners to CSV',
    description:
      'Returns learner data in CSV format including name, email, progress, quiz scores',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiQuery({
    name: 'status',
    enum: ProgressStatusFilter,
    required: false,
    description: 'Filter by progress status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'CSV file generated successfully',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to view this course analytics',
  })
  async exportLearnersToCSV(
    @Param('courseId') courseId: string,
    @Query() query: FilterLearnersQueryDto,
    @Request() req: any,
  ): Promise<string> {
    return this.dashboardService.exportLearnersToCSV(
      courseId,
      req.user.id,
      req.user.role,
      query.status,
    );
  }

  /**
   * Send bulk email to enrolled learners
   * Requirements: 14.8
   */
  @Post('courses/:courseId/bulk-email')
  @ApiOperation({
    summary: 'Send bulk email to enrolled learners',
    description:
      'Sends email to all enrolled learners or filtered subsets, queued for async processing',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk email queued successfully',
    type: BulkEmailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have permission to send emails for this course',
  })
  async sendBulkEmail(
    @Param('courseId') courseId: string,
    @Body() dto: BulkEmailDto,
    @Request() req: any,
  ): Promise<BulkEmailResponseDto> {
    return this.dashboardService.sendBulkEmail(
      courseId,
      req.user.id,
      req.user.role,
      dto,
    );
  }
}
