import { Test, TestingModule } from '@nestjs/testing';
import { ModuleService } from './module.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('ModuleService', () => {
  let service: ModuleService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    module: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ModuleService>(ModuleService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a module successfully', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const dto = {
        title: 'Module 1',
        description: 'Test module',
      };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      const mockModule = {
        id: 'module-1',
        title: dto.title,
        description: dto.description,
        order: 1,
        courseId,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      const result = await service.create(courseId, dto, userId, UserRole.INSTRUCTOR);

      expect(result).toEqual(mockModule);
      expect(mockPrismaService.course.findUnique).toHaveBeenCalledWith({
        where: { id: courseId },
      });
      expect(mockPrismaService.module.create).toHaveBeenCalledWith({
        data: {
          title: dto.title,
          description: dto.description,
          order: 1,
          courseId,
          prerequisiteId: undefined,
        },
      });
    });

    it('should throw NotFoundException if course does not exist', async () => {
      const courseId = 'non-existent';
      const userId = 'user-1';
      const dto = { title: 'Module 1' };

      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.create(courseId, dto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not course owner', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const dto = { title: 'Module 1' };

      const mockCourse = {
        id: courseId,
        ownerId: 'different-user',
        title: 'Test Course',
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.create(courseId, dto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to create module in any course', async () => {
      const courseId = 'course-1';
      const userId = 'admin-1';
      const dto = { title: 'Module 1' };

      const mockCourse = {
        id: courseId,
        ownerId: 'different-user',
        title: 'Test Course',
      };

      const mockModule = {
        id: 'module-1',
        title: dto.title,
        order: 1,
        courseId,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.aggregate.mockResolvedValue({
        _max: { order: 0 },
      });
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      const result = await service.create(courseId, dto, userId, UserRole.ADMIN);

      expect(result).toEqual(mockModule);
    });
  });

  describe('update', () => {
    it('should update a module successfully', async () => {
      const moduleId = 'module-1';
      const userId = 'user-1';
      const dto = { title: 'Updated Module' };

      const mockModule = {
        id: moduleId,
        title: 'Old Title',
        courseId: 'course-1',
        order: 1,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourse = {
        id: 'course-1',
        ownerId: userId,
      };

      const updatedModule = { ...mockModule, title: dto.title };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.update.mockResolvedValue(updatedModule);

      const result = await service.update(moduleId, dto, userId, UserRole.INSTRUCTOR);

      expect(result).toEqual(updatedModule);
      expect(mockPrismaService.module.update).toHaveBeenCalledWith({
        where: { id: moduleId },
        data: { title: dto.title },
      });
    });

    it('should throw BadRequestException if module is set as its own prerequisite', async () => {
      const moduleId = 'module-1';
      const userId = 'user-1';
      const dto = { prerequisiteId: moduleId };

      const mockModule = {
        id: moduleId,
        courseId: 'course-1',
        order: 1,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourse = {
        id: 'course-1',
        ownerId: userId,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      await expect(
        service.update(moduleId, dto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete a module successfully', async () => {
      const moduleId = 'module-1';
      const userId = 'user-1';

      const mockModule = {
        id: moduleId,
        courseId: 'course-1',
        order: 1,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourse = {
        id: 'course-1',
        ownerId: userId,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.count.mockResolvedValue(0);
      mockPrismaService.module.delete.mockResolvedValue(mockModule);

      await service.delete(moduleId, userId, UserRole.INSTRUCTOR);

      expect(mockPrismaService.module.delete).toHaveBeenCalledWith({
        where: { id: moduleId },
      });
    });

    it('should throw BadRequestException if module is a prerequisite for other modules', async () => {
      const moduleId = 'module-1';
      const userId = 'user-1';

      const mockModule = {
        id: moduleId,
        courseId: 'course-1',
        order: 1,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourse = {
        id: 'course-1',
        ownerId: userId,
      };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.count.mockResolvedValue(2);

      await expect(
        service.delete(moduleId, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorderModules', () => {
    it('should reorder modules successfully', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const moduleIds = ['module-1', 'module-2', 'module-3'];

      const mockCourse = {
        id: courseId,
        ownerId: userId,
      };

      const mockModules = [
        { id: 'module-1', courseId, order: 1 },
        { id: 'module-2', courseId, order: 2 },
        { id: 'module-3', courseId, order: 3 },
      ];

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.module.findMany.mockResolvedValueOnce(mockModules);

      const result = await service.reorderModules(
        courseId,
        moduleIds,
        userId,
        UserRole.INSTRUCTOR,
      );

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if module IDs are invalid', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const moduleIds = ['module-1', 'invalid-module'];

      const mockCourse = {
        id: courseId,
        ownerId: userId,
      };

      const mockModules = [{ id: 'module-1', courseId, order: 1 }];

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findMany.mockResolvedValue(mockModules);

      await expect(
        service.reorderModules(courseId, moduleIds, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validatePublishRequirements', () => {
    it('should pass validation if course has modules', async () => {
      const courseId = 'course-1';

      mockPrismaService.module.count.mockResolvedValue(2);

      await expect(
        service.validatePublishRequirements(courseId),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException if course has no modules', async () => {
      const courseId = 'course-1';

      mockPrismaService.module.count.mockResolvedValue(0);

      await expect(
        service.validatePublishRequirements(courseId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('prerequisite validation', () => {
    it('should create module with valid prerequisite', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const prerequisiteId = 'module-0';
      const dto = {
        title: 'Module 2',
        description: 'Second module',
        prerequisiteId,
      };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      const mockPrerequisite = {
        id: prerequisiteId,
        courseId,
        order: 1,
        title: 'Module 1',
      };

      const mockModule = {
        id: 'module-2',
        title: dto.title,
        description: dto.description,
        order: 2,
        courseId,
        prerequisiteId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique.mockResolvedValue(mockPrerequisite);
      mockPrismaService.module.aggregate.mockResolvedValue({
        _max: { order: 1 },
      });
      mockPrismaService.module.create.mockResolvedValue(mockModule);

      const result = await service.create(courseId, dto, userId, UserRole.INSTRUCTOR);

      expect(result.prerequisiteId).toBe(prerequisiteId);
    });

    it('should throw NotFoundException if prerequisite module does not exist', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const dto = {
        title: 'Module 2',
        prerequisiteId: 'non-existent-module',
      };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique.mockResolvedValue(null);

      await expect(
        service.create(courseId, dto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if prerequisite belongs to different course', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const prerequisiteId = 'module-from-other-course';
      const dto = {
        title: 'Module 2',
        prerequisiteId,
      };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      const mockPrerequisite = {
        id: prerequisiteId,
        courseId: 'different-course-id',
        order: 1,
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.findUnique.mockResolvedValue(mockPrerequisite);

      await expect(
        service.create(courseId, dto, userId, UserRole.INSTRUCTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow removing prerequisite by setting to null', async () => {
      const moduleId = 'module-1';
      const userId = 'user-1';
      const dto = { prerequisiteId: null };

      const mockModule = {
        id: moduleId,
        courseId: 'course-1',
        order: 1,
        prerequisiteId: 'old-prerequisite',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCourse = {
        id: 'course-1',
        ownerId: userId,
      };

      const updatedModule = { ...mockModule, prerequisiteId: null };

      mockPrismaService.module.findUnique.mockResolvedValue(mockModule);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.update.mockResolvedValue(updatedModule);

      const result = await service.update(moduleId, dto, userId, UserRole.INSTRUCTOR);

      expect(result.prerequisiteId).toBeNull();
    });
  });

  describe('module ordering', () => {
    it('should assign sequential order numbers when creating modules', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const dto = { title: 'Module 3' };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.aggregate.mockResolvedValue({
        _max: { order: 2 },
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: 'module-3',
        title: dto.title,
        order: 3,
        courseId,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(courseId, dto, userId, UserRole.INSTRUCTOR);

      expect(result.order).toBe(3);
    });

    it('should start order at 1 for first module', async () => {
      const courseId = 'course-1';
      const userId = 'user-1';
      const dto = { title: 'First Module' };

      const mockCourse = {
        id: courseId,
        ownerId: userId,
        title: 'Test Course',
      };

      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.module.aggregate.mockResolvedValue({
        _max: { order: null },
      });
      mockPrismaService.module.create.mockResolvedValue({
        id: 'module-1',
        title: dto.title,
        order: 1,
        courseId,
        prerequisiteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(courseId, dto, userId, UserRole.INSTRUCTOR);

      expect(result.order).toBe(1);
    });
  });

  describe('findByCourse', () => {
    it('should return modules ordered by order field', async () => {
      const courseId = 'course-1';
      const mockModules = [
        { id: 'module-1', order: 1, title: 'First' },
        { id: 'module-2', order: 2, title: 'Second' },
        { id: 'module-3', order: 3, title: 'Third' },
      ];

      mockPrismaService.module.findMany.mockResolvedValue(mockModules);

      const result = await service.findByCourse(courseId);

      expect(result).toEqual(mockModules);
      expect(mockPrismaService.module.findMany).toHaveBeenCalledWith({
        where: { courseId },
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array if course has no modules', async () => {
      const courseId = 'course-1';

      mockPrismaService.module.findMany.mockResolvedValue([]);

      const result = await service.findByCourse(courseId);

      expect(result).toEqual([]);
    });
  });
});
