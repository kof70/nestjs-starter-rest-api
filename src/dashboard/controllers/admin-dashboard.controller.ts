import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { AdminDashboardSummaryDto } from '../dtos/admin-dashboard-summary.dto';
import { AdminUserListDto } from '../dtos/admin-user-list.dto';
import { AdminCourseListDto } from '../dtos/admin-course-list.dto';
import {
  AssignRoleDto,
  AssignRoleResponseDto,
} from '../dtos/assign-role.dto';
import { BulkEnrollCsvResultDto } from '../dtos/bulk-enroll-csv.dto';
import { UserActivityListDto } from '../dtos/user-activity.dto';

/**
 * Controller for admin dashboard with system-wide analytics
 * Requirements: 8.7
 */
@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  /**
   * Get system-wide dashboard summary
   * Requirements: 8.7
   */
  @Get('summary')
  @ApiOperation({
    summary: 'Get system-wide dashboard summary',
    description:
      'Returns system-wide statistics including total users, courses, enrollments, and completion rates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard summary retrieved successfully',
    type: AdminDashboardSummaryDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async getDashboardSummary(): Promise<AdminDashboardSummaryDto> {
    return this.adminDashboardService.getDashboardSummary();
  }

  /**
   * Get paginated list of all users
   * Requirements: 8.7
   */
  @Get('users')
  @ApiOperation({
    summary: 'Get paginated list of all users',
    description:
      'Returns all users with pagination (20 items per page) including role, enrollment counts, and account details',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User list retrieved successfully',
    type: AdminUserListDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async getUserList(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ): Promise<AdminUserListDto> {
    return this.adminDashboardService.getUserList(page || 1);
  }

  /**
   * Get paginated list of all courses
   * Requirements: 8.7
   */
  @Get('courses')
  @ApiOperation({
    summary: 'Get paginated list of all courses',
    description:
      'Returns all courses with pagination (20 items per page) including owner details, enrollment counts, and course status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course list retrieved successfully',
    type: AdminCourseListDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async getCourseList(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ): Promise<AdminCourseListDto> {
    return this.adminDashboardService.getCourseList(page || 1);
  }

  /**
   * Assign role to a user
   * Requirements: 8.2
   */
  @Post('users/assign-role')
  @ApiOperation({
    summary: 'Assign role to a user',
    description:
      'Allows admins to change user roles (ADMIN, INSTRUCTOR, LEARNER)',
  })
  @ApiBody({ type: AssignRoleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role assigned successfully',
    type: AssignRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User already has this role',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async assignRole(@Body() dto: AssignRoleDto): Promise<AssignRoleResponseDto> {
    return this.adminDashboardService.assignRole(dto);
  }

  /**
   * Bulk enroll users via CSV upload
   * Requirements: 8.7, 13.7
   */
  @Post('enrollments/bulk-csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk enroll users via CSV upload',
    description:
      'Upload a CSV file with user emails or IDs (one per line) to enroll multiple users in a course',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        courseId: {
          type: 'string',
          format: 'uuid',
          description: 'Course ID to enroll users in',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with user emails or IDs',
        },
      },
      required: ['courseId', 'file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk enrollment completed',
    type: BulkEnrollCsvResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async bulkEnrollViaCsv(
    @Body('courseId') courseId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<BulkEnrollCsvResultDto> {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    if (!courseId) {
      throw new BadRequestException('Course ID is required');
    }
    const csvContent = file.buffer.toString('utf-8');
    return this.adminDashboardService.bulkEnrollViaCsv(courseId, csvContent);
  }

  /**
   * Get user activity across all courses
   * Requirements: 8.7
   */
  @Get('activity')
  @ApiOperation({
    summary: 'Get user activity across all courses',
    description:
      'Returns user activity including enrollments, progress, quiz attempts, and last activity timestamps',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User activity retrieved successfully',
    type: UserActivityListDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not have admin permissions',
  })
  async getUserActivity(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ): Promise<UserActivityListDto> {
    return this.adminDashboardService.getUserActivity(page || 1);
  }
}
