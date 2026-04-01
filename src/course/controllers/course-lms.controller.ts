import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';
import { CourseService } from '../services/course.service';
import { CourseQueryDto } from '../dtos/course-query.dto';
import {
  CourseResponseDto,
  PaginatedCourseResponseDto,
  CourseDetailResponseDto,
} from '../dtos/course-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole, CourseStatus, Language } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';

@ApiTags('LMS - Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lms/courses')
export class CourseLmsController {
  constructor(
    private readonly courseService: CourseService,
    private readonly i18n: I18nService,
  ) {}

  @Get()
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'List published courses for learners',
    description:
      'Retrieve a paginated list of published courses with optional filtering by language and search. Supports search by title and description. Automatically filters by user language preference if no language specified.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: ['EN', 'FR'],
    description: 'Filter by course language (defaults to user language preference)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by title or description (case-insensitive, partial match)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Published courses retrieved successfully',
    type: PaginatedCourseResponseDto,
  })
  async findPublishedCourses(
    @Query() query: CourseQueryDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<PaginatedCourseResponseDto> {
    const lmsQuery = {
      ...query,
      status: CourseStatus.PUBLISHED,
    };
    const userLanguage =
      (ctx.user?.language as Language | undefined) ?? Language.EN;
    return this.courseService.findAllForLms(lmsQuery, userLanguage);
  }

  @Get(':id')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get published course details for learners',
    description:
      'Retrieve full course details including modules, content items, and instructor information. Only published courses are accessible.',
  })
  @ApiParam({ name: 'id', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Course details retrieved successfully',
    type: CourseDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found or not published',
  })
  async findPublishedCourseById(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<CourseDetailResponseDto> {
    const userLanguage =
      (ctx.user?.language as Language | undefined) ?? Language.EN;
    const course = await this.courseService.findByIdForLms(id, userLanguage);
    if (course.status !== CourseStatus.PUBLISHED) {
      throw new NotFoundException(
        await this.i18n.translate('common.errors.courseNotAvailable', { lang: userLanguage }),
      );
    }
    return course;
  }
}
