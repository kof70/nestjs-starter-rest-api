import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
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
import { CourseService } from '../services/course.service';
import { CreateCourseDto } from '../dtos/create-course.dto';
import { UpdateCourseDto } from '../dtos/update-course.dto';
import { CourseQueryDto } from '../dtos/course-query.dto';
import {
  CourseResponseDto,
  PaginatedCourseResponseDto,
} from '../dtos/course-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { TeamPermissionGuard } from '../../team/guards/team-permission.guard';
import { TeamRole } from '../../team/decorators/team-role.decorator';
import { TeamActionLogInterceptor } from '../../team/interceptors/team-action-log.interceptor';
import { resolveRequestUserRole } from '../../shared/request-context/resolve-user-role';

@ApiTags('CMS - Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TeamPermissionGuard)
@UseInterceptors(TeamActionLogInterceptor)
@Controller('cms/courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Course created successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseResponseDto> {
    const userId = String(ctx.user!.id);
    return this.courseService.create(createCourseDto, userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'List courses with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Courses retrieved successfully',
    type: PaginatedCourseResponseDto,
  })
  async findAll(
    @Query() query: CourseQueryDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<PaginatedCourseResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.courseService.findAll(query, userId, userRole);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('VIEWER')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course retrieved successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  async findById(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseResponseDto> {
    const userLanguage = ctx.user?.language || 'EN';
    return this.courseService.findById(id, userLanguage as any);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Update course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course updated successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    const userLanguage = ctx.user?.language || 'EN';
    return this.courseService.update(id, updateCourseDto, userId, userRole, userLanguage as any);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Course deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async delete(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    const userLanguage = ctx.user?.language || 'EN';
    await this.courseService.delete(id, userId, userRole, userLanguage as any);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Publish a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course published successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Course must have at least one module',
  })
  async publish(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    const userLanguage = ctx.user?.language || 'EN';
    return this.courseService.publish(id, userId, userRole, userLanguage as any);
  }

  @Post(':id/archive')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Archive a course' })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course archived successfully',
    type: CourseResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async archive(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    const userLanguage = ctx.user?.language || 'EN';
    return this.courseService.archive(id, userId, userRole, userLanguage as any);
  }
}
