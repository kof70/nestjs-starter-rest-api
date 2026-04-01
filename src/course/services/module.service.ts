import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateModuleDto } from '../dtos/create-module.dto';
import { UpdateModuleDto } from '../dtos/update-module.dto';
import { UserRole, CourseStatus } from '@prisma/client';

@Injectable()
export class ModuleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    courseId: string,
    dto: CreateModuleDto,
    userId: string,
    userRole: UserRole,
  ) {
    // Verify course exists and user has permission
    await this.validateCourseAccess(courseId, userId, userRole);

    // Validate prerequisite if provided
    if (dto.prerequisiteId) {
      await this.validatePrerequisite(courseId, dto.prerequisiteId);
    }

    // Get the next order number
    const maxOrder = await this.prisma.module.aggregate({
      where: { courseId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    return this.prisma.module.create({
      data: {
        title: dto.title,
        description: dto.description,
        order: nextOrder,
        courseId,
        prerequisiteId: dto.prerequisiteId,
      },
    });
  }

  async update(
    moduleId: string,
    dto: UpdateModuleDto,
    userId: string,
    userRole: UserRole,
  ) {
    const module = await this.findById(moduleId);

    // Verify user has permission to modify the course
    await this.validateCourseAccess(module.courseId, userId, userRole);

    // Validate prerequisite if provided
    if (dto.prerequisiteId !== undefined) {
      if (dto.prerequisiteId === null) {
        // Allow removing prerequisite
      } else if (dto.prerequisiteId === moduleId) {
        throw new BadRequestException('Module cannot be its own prerequisite');
      } else {
        await this.validatePrerequisite(module.courseId, dto.prerequisiteId);
      }
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.prerequisiteId !== undefined) {
      updateData.prerequisiteId = dto.prerequisiteId;
    }

    return this.prisma.module.update({
      where: { id: moduleId },
      data: updateData,
    });
  }

  async delete(moduleId: string, userId: string, userRole: UserRole) {
    const module = await this.findById(moduleId);

    // Verify user has permission to modify the course
    await this.validateCourseAccess(module.courseId, userId, userRole);

    // Check if any other modules depend on this one
    const dependentModules = await this.prisma.module.count({
      where: { prerequisiteId: moduleId },
    });

    if (dependentModules > 0) {
      throw new BadRequestException(
        'Cannot delete module that is a prerequisite for other modules',
      );
    }

    await this.prisma.module.delete({ where: { id: moduleId } });
  }

  async findById(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    return module;
  }

  async findByCourse(courseId: string) {
    return this.prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  async reorderModules(
    courseId: string,
    moduleIds: string[],
    userId: string,
    userRole: UserRole,
  ) {
    // Verify user has permission to modify the course
    await this.validateCourseAccess(courseId, userId, userRole);

    // Verify all modules belong to this course
    const modules = await this.prisma.module.findMany({
      where: { courseId },
    });

    const courseModuleIds = modules.map((m) => m.id);
    const invalidIds = moduleIds.filter((id) => !courseModuleIds.includes(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid module IDs: ${invalidIds.join(', ')}`,
      );
    }

    // Check if all modules are included
    if (moduleIds.length !== modules.length) {
      throw new BadRequestException(
        'All course modules must be included in reorder operation',
      );
    }

    // Update order for each module
    await this.prisma.$transaction(
      moduleIds.map((moduleId, index) =>
        this.prisma.module.update({
          where: { id: moduleId },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findByCourse(courseId);
  }

  async validatePublishRequirements(courseId: string): Promise<void> {
    const moduleCount = await this.prisma.module.count({
      where: { courseId },
    });

    if (moduleCount === 0) {
      throw new BadRequestException(
        'Cannot publish course without at least one module',
      );
    }
  }

  private async validateCourseAccess(
    courseId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Admin can access any course
    if (userRole === UserRole.ADMIN) {
      return;
    }

    // Instructor can only access their own courses
    if (course.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this course',
      );
    }
  }

  private async validatePrerequisite(
    courseId: string,
    prerequisiteId: string,
  ): Promise<void> {
    const prerequisite = await this.prisma.module.findUnique({
      where: { id: prerequisiteId },
    });

    if (!prerequisite) {
      throw new NotFoundException(
        `Prerequisite module with ID ${prerequisiteId} not found`,
      );
    }

    if (prerequisite.courseId !== courseId) {
      throw new BadRequestException(
        'Prerequisite module must belong to the same course',
      );
    }
  }
}
