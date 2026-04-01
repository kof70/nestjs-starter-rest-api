import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollDto } from '../dtos/enroll.dto';
import { EnrollmentResponseDto } from '../dtos/enrollment-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole, EnrollmentStatus } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';

@ApiTags('Enrollments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully enrolled in course',
    type: EnrollmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid enrollment data or already enrolled',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async enroll(
    @Body() enrollDto: EnrollDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<EnrollmentResponseDto> {
    const userId = String(ctx.user!.id);
    return this.enrollmentService.enroll(enrollDto, userId);
  }

  @Delete(':courseId')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unenroll from a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully unenrolled from course',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Active enrollment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot unenroll from completed course',
  })
  async unenroll(
    @Param('courseId') courseId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    const userId = String(ctx.user!.id);
    await this.enrollmentService.unenroll(courseId, userId);
  }

  @Get('my-enrollments')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all enrollments for current user' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EnrollmentStatus,
    description: 'Filter by enrollment status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollments retrieved successfully',
    type: [EnrollmentResponseDto],
  })
  async getMyEnrollments(
    @Query('status') status: EnrollmentStatus | undefined,
    @ReqContext() ctx: RequestContext,
  ): Promise<EnrollmentResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.enrollmentService.findByUser(userId, status);
  }

  @Get('course/:courseId')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all enrollments for a course (instructor/admin)' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course enrollments retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getCourseEnrollments(
    @Param('courseId') courseId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @ReqContext() ctx: RequestContext,
  ) {
    const userId = String(ctx.user!.id);
    const roleStr = ctx.user!.roles?.[0] ?? ctx.user!.role;
    if (!roleStr) {
      throw new BadRequestException('Missing role in token');
    }
    const userRole = this.mapRole(roleStr);
    return this.enrollmentService.findByCourse(
      courseId,
      userId,
      userRole,
      page,
      limit,
    );
  }

  @Get('check/:courseId')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Check if user is enrolled in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enrollment status checked',
  })
  async checkEnrollment(
    @Param('courseId') courseId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<{ enrolled: boolean }> {
    const userId = String(ctx.user!.id);
    const enrolled = await this.enrollmentService.isEnrolled(courseId, userId);
    return { enrolled };
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk enroll users in a course (admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bulk enrollment completed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admins can perform bulk enrollment',
  })
  async bulkEnroll(
    @Body() bulkEnrollDto: any,
    @ReqContext() ctx: RequestContext,
  ) {
    const adminId = String(ctx.user!.id);
    const roleStr = ctx.user!.roles?.[0] ?? ctx.user!.role;
    if (!roleStr) {
      throw new BadRequestException('Missing role in token');
    }
    const adminRole = this.mapRole(roleStr);

    return this.enrollmentService.bulkEnroll(
      bulkEnrollDto.courseId,
      bulkEnrollDto.userIds,
      adminId,
      adminRole,
    );
  }

  @Post('bulk/csv')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk enroll users via CSV upload (admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'CSV processed and users enrolled',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid CSV format',
  })
  async bulkEnrollCsv(
    @Body() body: { courseId: string; csvContent: string },
    @ReqContext() ctx: RequestContext,
  ) {
    const adminId = String(ctx.user!.id);
    const roleStr = ctx.user!.roles?.[0] ?? ctx.user!.role;
    if (!roleStr) {
      throw new BadRequestException('Missing role in token');
    }
    const adminRole = this.mapRole(roleStr);

    // Parse CSV to extract user IDs
    const userIds = await this.enrollmentService.parseCsvForBulkEnroll(
      body.csvContent,
    );

    if (userIds.length === 0) {
      throw new BadRequestException('No valid users found in CSV');
    }

    return this.enrollmentService.bulkEnroll(
      body.courseId,
      userIds,
      adminId,
      adminRole,
    );
  }

  private mapRole(role: string): UserRole {
    return role as UserRole;
  }
}
