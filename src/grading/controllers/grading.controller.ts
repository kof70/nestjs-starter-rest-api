import {
  Controller,
  Get,
  Post,
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
  ApiParam,
} from '@nestjs/swagger';
import { GradingService } from '../services/grading.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { GradeBreakdownDto } from '../dtos/grade-breakdown.dto';
import { GradeHistoryDto } from '../dtos/grade-history.dto';
import { UpdateGradeDto } from '../dtos/update-grade.dto';

/**
 * Controller for managing grades and grade calculations
 */
@ApiTags('Grading')
@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Get('courses/:courseId/breakdown')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grade breakdown for current user in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade breakdown retrieved successfully',
    type: GradeBreakdownDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async getGradeBreakdown(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<GradeBreakdownDto> {
    return this.gradingService.getGradeBreakdown(req.user.id, courseId);
  }

  @Get('courses/:courseId/history')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grade history for current user in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade history retrieved successfully',
    type: GradeHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async getGradeHistory(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<GradeHistoryDto> {
    return this.gradingService.getGradeHistory(req.user.id, courseId);
  }

  @Get('users/:userId/courses/:courseId/breakdown')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grade breakdown for specific user (instructor/admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade breakdown retrieved successfully',
    type: GradeBreakdownDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUserGradeBreakdown(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ): Promise<GradeBreakdownDto> {
    return this.gradingService.getGradeBreakdown(userId, courseId);
  }

  @Get('users/:userId/courses/:courseId/history')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grade history for specific user (instructor/admin)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade history retrieved successfully',
    type: GradeHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUserGradeHistory(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ): Promise<GradeHistoryDto> {
    return this.gradingService.getGradeHistory(userId, courseId);
  }

  @Post('calculate/:courseId')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger grade recalculation for a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grades recalculated successfully',
    type: GradeBreakdownDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async calculateGrades(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ): Promise<GradeBreakdownDto> {
    return this.gradingService.getGradeBreakdown(req.user.id, courseId);
  }

  @Post('grades/:gradeId/override')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Override a grade (instructor/admin only)' })
  @ApiParam({ name: 'gradeId', description: 'Grade ID to override' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grade overridden successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Grade not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async overrideGrade(
    @Param('gradeId') gradeId: string,
    @Body() updateGradeDto: UpdateGradeDto,
  ): Promise<{ message: string }> {
    await this.gradingService.updateGrade(
      gradeId,
      updateGradeDto.score,
      updateGradeDto.reason,
    );
    return { message: 'Grade overridden successfully' };
  }

  @Get('courses/:courseId/overrides')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all overridden grades for a course (instructor/admin)' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Overridden grades retrieved successfully',
    type: [GradeHistoryDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async getCourseOverrides(
    @Param('courseId') courseId: string,
  ): Promise<GradeHistoryDto[]> {
    return this.gradingService.getCourseOverrides(courseId);
  }

  @Get('content-items/:contentItemId/history')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get grade history for a specific content item (instructor/admin)' })
  @ApiParam({ name: 'contentItemId', description: 'Content item ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content item grade history retrieved successfully',
    type: [GradeHistoryDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Content item not found',
  })
  async getContentItemGradeHistory(
    @Param('contentItemId') contentItemId: string,
  ): Promise<GradeHistoryDto[]> {
    return this.gradingService.getContentItemGradeHistory(contentItemId);
  }
}
