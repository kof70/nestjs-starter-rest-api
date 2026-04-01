import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { CreateCourseDto } from '../dtos/create-course.dto';
import { UpdateCourseDto } from '../dtos/update-course.dto';
import { CourseQueryDto } from '../dtos/course-query.dto';
import { UserRole, CourseStatus, Course, Prisma, Language } from '@prisma/client';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateCourseDto, instructorId: string): Promise<Course> {
    const data: Prisma.CourseCreateInput = {
      title: dto.title,
      description: dto.description,
      language: dto.language,
      owner: {
        connect: { id: instructorId },
      },
    };

    if (dto.enrollmentStart) {
      data.enrollmentStart = new Date(dto.enrollmentStart);
    }
    if (dto.enrollmentEnd) {
      data.enrollmentEnd = new Date(dto.enrollmentEnd);
    }
    if (dto.courseStart) {
      data.courseStart = new Date(dto.courseStart);
    }
    if (dto.courseEnd) {
      data.courseEnd = new Date(dto.courseEnd);
    }

    return this.prisma.course.create({ data });
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
    userId: string,
    userRole: UserRole,
    lang: Language = Language.EN,
  ): Promise<Course> {
    const course = await this.findById(id, lang);
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('common.errors.noPermissionModifyCourse', { lang }),
      );
    }

    const data: Prisma.CourseUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.language !== undefined) data.language = dto.language;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.enrollmentStart !== undefined) {
      data.enrollmentStart = new Date(dto.enrollmentStart);
    }
    if (dto.enrollmentEnd !== undefined) {
      data.enrollmentEnd = new Date(dto.enrollmentEnd);
    }
    if (dto.courseStart !== undefined) {
      data.courseStart = new Date(dto.courseStart);
    }
    if (dto.courseEnd !== undefined) {
      data.courseEnd = new Date(dto.courseEnd);
    }

    return this.prisma.course.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string, userRole: UserRole, lang: Language = Language.EN): Promise<void> {
    const course = await this.findById(id, lang);
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('common.errors.noPermissionDeleteCourse', { lang }),
      );
    }
    await this.prisma.course.delete({ where: { id } });
  }

  async findById(id: string, lang: Language = Language.EN): Promise<Course> {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });
    if (!course) {
      throw new NotFoundException(
        await this.i18n.translate('common.errors.courseNotFound', { lang }),
      );
    }
    return course;
  }

  async findAll(query: CourseQueryDto, userId?: string, userRole?: UserRole) {
    const { page = 1, limit = 20, language, status, search } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CourseWhereInput = {};
    if (language) {
      where.language = language;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (userRole === UserRole.INSTRUCTOR && userId) {
      where.ownerId = userId;
    }
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);
    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllForLms(query: CourseQueryDto, userLanguage?: Language) {
    const { page = 1, limit = 20, language, status, search } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.CourseWhereInput = {
      status: status || CourseStatus.PUBLISHED,
    };
    if (language) {
      where.language = language;
    } else if (userLanguage) {
      where.language = userLanguage;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);
    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdForLms(id: string, lang: Language = Language.EN) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            contentItems: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                type: true,
                order: true,
                mandatory: true,
              },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException(
        await this.i18n.translate('common.errors.courseNotFound', { lang }),
      );
    }
    return {
      ...course,
      instructor: course.owner,
    };
  }

  async validateOwnership(
    courseId: string,
    userId: string,
    userRole: UserRole,
    lang: Language = Language.EN,
  ): Promise<boolean> {
    if (userRole === UserRole.ADMIN) {
      return true;
    }
    const course = await this.findById(courseId, lang);
    return course.ownerId === userId;
  }

  async publish(
    courseId: string,
    userId: string,
    userRole: UserRole,
    lang: Language = Language.EN,
  ): Promise<any> {
    const course = await this.findById(courseId, lang);
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('common.errors.noPermissionPublishCourse', { lang }),
      );
    }
    const moduleCount = await this.prisma.module.count({
      where: { courseId },
    });
    if (moduleCount === 0) {
      throw new BadRequestException(
        await this.i18n.translate('common.errors.cannotPublishWithoutModule', { lang }),
      );
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.PUBLISHED },
    });
    try {
      await this.notificationService.sendCoursePublishedEmail(courseId);
    } catch (error) {
      this.logger.error(`Failed to send course published notifications for course ${courseId}:`, error);
    }
    return updatedCourse;
  }

  async archive(
    courseId: string,
    userId: string,
    userRole: UserRole,
    lang: Language = Language.EN,
  ): Promise<any> {
    const course = await this.findById(courseId, lang);
    if (userRole !== UserRole.ADMIN && course.ownerId !== userId) {
      throw new ForbiddenException(
        await this.i18n.translate('common.errors.noPermissionArchiveCourse', { lang }),
      );
    }
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: CourseStatus.ARCHIVED },
    });
  }
}
