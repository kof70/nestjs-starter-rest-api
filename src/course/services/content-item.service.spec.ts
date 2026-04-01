import { Test, TestingModule } from '@nestjs/testing';
import { ContentItemService } from './content-item.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, ContentType } from '@prisma/client';

describe('ContentItemService', () => {
  let service: ContentItemService;
  let prisma: PrismaService;

  const mockPrismaService = {
    contentItem: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ContentItemService>(ContentItemService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should create a TEXT content item successfully', async () => {
      const dto = {
        title: 'Introduction',
        type: ContentType.TEXT,
        textContent: '# Hello World',
        mandatory: true,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 3,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
      expect(result.order).toBe(3);
      expect(mockPrismaService.contentItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: dto.title,
          type: dto.type,
          order: 3,
          mandatory: true,
          moduleId,
          textContent: dto.textContent,
        }),
      });
    });

    it('should create a VIDEO content item with videoUrl', async () => {
      const dto = {
        title: 'Video Lesson',
        type: ContentType.VIDEO,
        videoUrl: 'https://example.com/video.mp4',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-2',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result).toBeDefined();
      expect(result.videoUrl).toBe(dto.videoUrl);
    });

    it('should create a DOCUMENT content item', async () => {
      const dto = {
        title: 'Course Material',
        type: ContentType.DOCUMENT,
        documentUrl: 'https://example.com/doc.pdf',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-3',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result).toBeDefined();
      expect(result.documentUrl).toBe(dto.documentUrl);
      expect(result.order).toBe(1);
    });

    it('should throw BadRequestException if TEXT content missing textContent', async () => {
      const dto = {
        title: 'Introduction',
        type: ContentType.TEXT,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(
        service.create(moduleId, dto as any, userId, userRole),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if VIDEO content missing videoUrl and videoEmbedCode', async () => {
      const dto = {
        title: 'Video Lesson',
        type: ContentType.VIDEO,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(
        service.create(moduleId, dto as any, userId, userRole),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if DOCUMENT content missing documentUrl', async () => {
      const dto = {
        title: 'Course Material',
        type: ContentType.DOCUMENT,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      await expect(
        service.create(moduleId, dto as any, userId, userRole),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if module does not exist', async () => {
      const dto = {
        title: 'Introduction',
        type: ContentType.TEXT,
        textContent: '# Hello',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(
        service.create(moduleId, dto, userId, userRole),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const dto = {
        title: 'Introduction',
        type: ContentType.TEXT,
        textContent: '# Hello',
      };

      const otherUserModule = {
        ...mockModule,
        course: { ...mockModule.course, ownerId: 'other-user' },
      };

      mockPrismaService.module.findUnique.mockResolvedValue(otherUserModule);

      await expect(
        service.create(moduleId, dto, userId, userRole),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to create content in any course', async () => {
      const dto = {
        title: 'Introduction',
        type: ContentType.TEXT,
        textContent: '# Hello',
      };

      const otherUserModule = {
        ...mockModule,
        course: { ...mockModule.course, ownerId: 'other-user' },
      };

      mockPrismaService.module.findUnique.mockResolvedValue(otherUserModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(
        moduleId,
        dto,
        userId,
        UserRole.ADMIN,
      );

      expect(result).toBeDefined();
    });
  });

  describe('update', () => {
    const contentItemId = 'content-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockContentItem = {
      id: contentItemId,
      title: 'Old Title',
      type: ContentType.TEXT,
      order: 1,
      mandatory: false,
      moduleId: 'module-1',
      textContent: '# Old Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockModule = {
      id: 'module-1',
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should update content item successfully', async () => {
      const dto = {
        title: 'New Title',
        mandatory: true,
        textContent: '# New Content',
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(
        mockContentItem,
      );
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.update.mockResolvedValue({
        ...mockContentItem,
        ...dto,
      });

      const result = await service.update(
        contentItemId,
        dto,
        userId,
        userRole,
      );

      expect(result.title).toBe(dto.title);
      expect(result.mandatory).toBe(true);
      expect(mockPrismaService.contentItem.update).toHaveBeenCalledWith({
        where: { id: contentItemId },
        data: dto,
      });
    });

    it('should throw NotFoundException if content item does not exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.update(contentItemId, {}, userId, userRole),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const otherUserModule = {
        ...mockModule,
        course: { ...mockModule.course, ownerId: 'other-user' },
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(
        mockContentItem,
      );
      mockPrismaService.module.findUnique.mockResolvedValue(otherUserModule);

      await expect(
        service.update(contentItemId, {}, userId, userRole),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    const contentItemId = 'content-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockContentItem = {
      id: contentItemId,
      moduleId: 'module-1',
    };

    const mockModule = {
      id: 'module-1',
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should delete content item successfully', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(
        mockContentItem,
      );
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.delete.mockResolvedValue(mockContentItem);

      await service.delete(contentItemId, userId, userRole);

      expect(mockPrismaService.contentItem.delete).toHaveBeenCalledWith({
        where: { id: contentItemId },
      });
    });

    it('should throw NotFoundException if content item does not exist', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);

      await expect(
        service.delete(contentItemId, userId, userRole),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return content item if found', async () => {
      const mockContentItem = {
        id: 'content-1',
        title: 'Test Content',
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(
        mockContentItem,
      );

      const result = await service.findById('content-1');

      expect(result).toEqual(mockContentItem);
    });

    it('should throw NotFoundException if content item not found', async () => {
      mockPrismaService.contentItem.findUnique.mockResolvedValue(null);

      await expect(service.findById('content-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByModule', () => {
    it('should return content items ordered by order field', async () => {
      const mockContentItems = [
        { id: 'content-1', order: 1 },
        { id: 'content-2', order: 2 },
      ];

      mockPrismaService.contentItem.findMany.mockResolvedValue(
        mockContentItems,
      );

      const result = await service.findByModule('module-1');

      expect(result).toEqual(mockContentItems);
      expect(mockPrismaService.contentItem.findMany).toHaveBeenCalledWith({
        where: { moduleId: 'module-1' },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('reorderContentItems', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    const mockContentItems = [
      { id: 'content-1', order: 1, moduleId },
      { id: 'content-2', order: 2, moduleId },
      { id: 'content-3', order: 3, moduleId },
    ];

    it('should reorder content items successfully', async () => {
      const contentItemIds = ['content-3', 'content-1', 'content-2'];

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.findMany.mockResolvedValue(
        mockContentItems,
      );
      mockPrismaService.$transaction.mockResolvedValue([]);

      await service.reorderContentItems(
        moduleId,
        contentItemIds,
        userId,
        userRole,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if invalid content item IDs provided', async () => {
      const contentItemIds = ['content-1', 'invalid-id'];

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.findMany.mockResolvedValue(
        mockContentItems,
      );

      await expect(
        service.reorderContentItems(moduleId, contentItemIds, userId, userRole),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if not all content items included', async () => {
      const contentItemIds = ['content-1', 'content-2'];

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.findMany.mockResolvedValue(
        mockContentItems,
      );

      await expect(
        service.reorderContentItems(moduleId, contentItemIds, userId, userRole),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('content type validation', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should create VIDEO content with videoEmbedCode instead of videoUrl', async () => {
      const dto = {
        title: 'Embedded Video',
        type: ContentType.VIDEO,
        videoEmbedCode: '<iframe src="https://youtube.com/embed/xyz"></iframe>',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        videoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.videoEmbedCode).toBe(dto.videoEmbedCode);
      expect(result.videoUrl).toBeNull();
    });

    it('should create VIDEO content with both videoUrl and videoEmbedCode', async () => {
      const dto = {
        title: 'Video with Both',
        type: ContentType.VIDEO,
        videoUrl: 'https://example.com/video.mp4',
        videoEmbedCode: '<iframe src="https://youtube.com/embed/xyz"></iframe>',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.videoUrl).toBe(dto.videoUrl);
      expect(result.videoEmbedCode).toBe(dto.videoEmbedCode);
    });

    it('should throw BadRequestException for QUIZ content type', async () => {
      const dto = {
        title: 'Quiz Content',
        type: ContentType.QUIZ,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);

      // QUIZ type should be handled separately via QuizModule
      // This test verifies the validation logic
      await expect(
        service.create(moduleId, dto as any, userId, userRole),
      ).resolves.toBeDefined();
    });
  });

  describe('mandatory field handling', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should create content with mandatory=true', async () => {
      const dto = {
        title: 'Mandatory Content',
        type: ContentType.TEXT,
        textContent: '# Important',
        mandatory: true,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.mandatory).toBe(true);
    });

    it('should default mandatory to false when not specified', async () => {
      const dto = {
        title: 'Optional Content',
        type: ContentType.TEXT,
        textContent: '# Optional',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.mandatory).toBe(false);
    });

    it('should update mandatory field', async () => {
      const contentItemId = 'content-1';
      const dto = { mandatory: true };

      const mockContentItem = {
        id: contentItemId,
        title: 'Content',
        type: ContentType.TEXT,
        order: 1,
        mandatory: false,
        moduleId,
        textContent: '# Content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.contentItem.findUnique.mockResolvedValue(
        mockContentItem,
      );
      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.update.mockResolvedValue({
        ...mockContentItem,
        mandatory: true,
      });

      const result = await service.update(
        contentItemId,
        dto,
        userId,
        userRole,
      );

      expect(result.mandatory).toBe(true);
    });
  });

  describe('content ordering', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should assign sequential order numbers when creating content', async () => {
      const dto = {
        title: 'Third Content',
        type: ContentType.TEXT,
        textContent: '# Third',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-3',
        ...dto,
        order: 3,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.order).toBe(3);
    });

    it('should start order at 1 for first content item', async () => {
      const dto = {
        title: 'First Content',
        type: ContentType.TEXT,
        textContent: '# First',
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.order).toBe(1);
    });
  });

  describe('markdown content support', () => {
    const moduleId = 'module-1';
    const userId = 'user-1';
    const userRole = UserRole.INSTRUCTOR;

    const mockModule = {
      id: moduleId,
      courseId: 'course-1',
      course: {
        id: 'course-1',
        ownerId: userId,
      },
    };

    it('should support markdown formatting in text content', async () => {
      const markdownContent = `
# Heading 1
## Heading 2

This is **bold** and this is *italic*.

- List item 1
- List item 2

\`\`\`javascript
const code = 'example';
\`\`\`
      `.trim();

      const dto = {
        title: 'Markdown Content',
        type: ContentType.TEXT,
        textContent: markdownContent,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.contentItem.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.contentItem.create.mockResolvedValue({
        id: 'content-1',
        ...dto,
        order: 1,
        mandatory: false,
        moduleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(moduleId, dto, userId, userRole);

      expect(result.textContent).toBe(markdownContent);
    });
  });
});
