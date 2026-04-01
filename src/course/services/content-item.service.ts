import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateContentItemDto } from '../dtos/create-content-item.dto';
import { UpdateContentItemDto } from '../dtos/update-content-item.dto';
import { UserRole, ContentType } from '@prisma/client';

@Injectable()
export class ContentItemService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    moduleId: string,
    dto: CreateContentItemDto,
    userId: string,
    userRole: UserRole,
  ) {
    // Verify module exists and user has permission
    const module = await this.validateModuleAccess(moduleId, userId, userRole);

    // Validate content type matches provided fields
    this.validateContentFields(dto.type, dto);

    // Get the next order number
    const maxOrder = await this.prisma.contentItem.aggregate({
      where: { moduleId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? 0) + 1;

    return this.prisma.contentItem.create({
      data: {
        title: dto.title,
        type: dto.type,
        order: nextOrder,
        mandatory: dto.mandatory ?? false,
        moduleId,
        textContent: dto.textContent,
        videoUrl: dto.videoUrl,
        videoEmbedCode: dto.videoEmbedCode,
        documentUrl: dto.documentUrl,
      },
    });
  }

  async update(
    contentItemId: string,
    dto: UpdateContentItemDto,
    userId: string,
    userRole: UserRole,
  ) {
    const contentItem = await this.findById(contentItemId);

    // Verify user has permission to modify the course
    await this.validateModuleAccess(contentItem.moduleId, userId, userRole);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.mandatory !== undefined) updateData.mandatory = dto.mandatory;
    if (dto.textContent !== undefined) updateData.textContent = dto.textContent;
    if (dto.videoUrl !== undefined) updateData.videoUrl = dto.videoUrl;
    if (dto.videoEmbedCode !== undefined)
      updateData.videoEmbedCode = dto.videoEmbedCode;
    if (dto.documentUrl !== undefined) updateData.documentUrl = dto.documentUrl;

    return this.prisma.contentItem.update({
      where: { id: contentItemId },
      data: updateData,
    });
  }

  async delete(contentItemId: string, userId: string, userRole: UserRole) {
    const contentItem = await this.findById(contentItemId);

    // Verify user has permission to modify the course
    await this.validateModuleAccess(contentItem.moduleId, userId, userRole);

    await this.prisma.contentItem.delete({ where: { id: contentItemId } });
  }

  async findById(contentItemId: string) {
    const contentItem = await this.prisma.contentItem.findUnique({
      where: { id: contentItemId },
    });

    if (!contentItem) {
      throw new NotFoundException(
        `Content item with ID ${contentItemId} not found`,
      );
    }

    return contentItem;
  }

  async findByModule(moduleId: string) {
    return this.prisma.contentItem.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
    });
  }

  async reorderContentItems(
    moduleId: string,
    contentItemIds: string[],
    userId: string,
    userRole: UserRole,
  ) {
    // Verify user has permission to modify the course
    await this.validateModuleAccess(moduleId, userId, userRole);

    // Verify all content items belong to this module
    const contentItems = await this.prisma.contentItem.findMany({
      where: { moduleId },
    });

    const moduleContentItemIds = contentItems.map((c) => c.id);
    const invalidIds = contentItemIds.filter(
      (id) => !moduleContentItemIds.includes(id),
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid content item IDs: ${invalidIds.join(', ')}`,
      );
    }

    // Check if all content items are included
    if (contentItemIds.length !== contentItems.length) {
      throw new BadRequestException(
        'All module content items must be included in reorder operation',
      );
    }

    // Update order for each content item
    await this.prisma.$transaction(
      contentItemIds.map((contentItemId, index) =>
        this.prisma.contentItem.update({
          where: { id: contentItemId },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findByModule(moduleId);
  }

  private async validateModuleAccess(
    moduleId: string,
    userId: string,
    userRole: UserRole,
  ) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });

    if (!module) {
      throw new NotFoundException(`Module with ID ${moduleId} not found`);
    }

    // Admin can access any course
    if (userRole === UserRole.ADMIN) {
      return module;
    }

    // Instructor can only access their own courses
    if (module.course.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this course',
      );
    }

    return module;
  }

  private validateContentFields(type: ContentType, dto: CreateContentItemDto) {
    switch (type) {
      case ContentType.TEXT:
        if (!dto.textContent) {
          throw new BadRequestException(
            'textContent is required for TEXT content type',
          );
        }
        break;
      case ContentType.VIDEO:
        if (!dto.videoUrl && !dto.videoEmbedCode) {
          throw new BadRequestException(
            'videoUrl or videoEmbedCode is required for VIDEO content type',
          );
        }
        break;
      case ContentType.DOCUMENT:
        if (!dto.documentUrl) {
          throw new BadRequestException(
            'documentUrl is required for DOCUMENT content type',
          );
        }
        break;
      case ContentType.QUIZ:
        // Quiz content is handled separately via QuizModule
        break;
      default:
        throw new BadRequestException(`Invalid content type: ${type}`);
    }
  }
}
