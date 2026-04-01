import { Test, TestingModule } from '@nestjs/testing';
import { ExportController } from './export.controller';
import { ExportService } from '../services/export.service';
import { ImportService } from '../services/import.service';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { ExportFormat } from '../dtos/export-course.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: ExportService;
  let importService: ImportService;

  const mockExportService = {
    exportCourse: jest.fn(),
  };

  const mockImportService = {
    importCourse: jest.fn(),
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        {
          provide: ExportService,
          useValue: mockExportService,
        },
        {
          provide: ImportService,
          useValue: mockImportService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExportController>(ExportController);
    exportService = module.get<ExportService>(ExportService);
    importService = module.get<ImportService>(ImportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportCourse', () => {
    const mockCourseId = 'course-123';
    const mockUserId = 'user-123';
    const mockContext = {
      user: {
        id: mockUserId,
        role: UserRole.INSTRUCTOR,
        email: 'test@example.com',
      },
    };

    it('should export course as JSON successfully', async () => {
      // Arrange
      const mockExportData = {
        data: Buffer.from('{"test": "data"}'),
        filename: 'course-123-1234567890.json',
        mimeType: 'application/json',
      };
      mockExportService.exportCourse.mockResolvedValueOnce(mockExportData);
      const res = mockResponse();
      const query = { format: ExportFormat.JSON };

      // Act
      await controller.exportCourse(mockCourseId, query, mockContext as any, res);

      // Assert
      expect(exportService.exportCourse).toHaveBeenCalledWith(
        mockCourseId,
        mockUserId,
        UserRole.INSTRUCTOR,
        ExportFormat.JSON,
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="course-123-1234567890.json"',
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', mockExportData.data.length);
      expect(res.send).toHaveBeenCalledWith(mockExportData.data);
    });

    it('should use JSON format by default when format not specified', async () => {
      // Arrange
      const mockExportData = {
        data: Buffer.from('{"test": "data"}'),
        filename: 'course-123-1234567890.json',
        mimeType: 'application/json',
      };
      mockExportService.exportCourse.mockResolvedValueOnce(mockExportData);
      const res = mockResponse();
      const query = {};

      // Act
      await controller.exportCourse(mockCourseId, query as any, mockContext as any, res);

      // Assert
      expect(exportService.exportCourse).toHaveBeenCalledWith(
        mockCourseId,
        mockUserId,
        UserRole.INSTRUCTOR,
        ExportFormat.JSON,
      );
    });

    it('should set correct headers for ZIP format', async () => {
      // Arrange
      const mockExportData = {
        data: Buffer.from('zip content'),
        filename: 'course-123-1234567890.zip',
        mimeType: 'application/zip',
      };
      mockExportService.exportCourse.mockResolvedValueOnce(mockExportData);
      const res = mockResponse();
      const query = { format: ExportFormat.ZIP };

      // Act
      await controller.exportCourse(mockCourseId, query, mockContext as any, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="course-123-1234567890.zip"',
      );
    });

    it('should pass user context to export service', async () => {
      // Arrange
      const adminContext = {
        user: {
          id: 'admin-123',
          role: UserRole.ADMIN,
          email: 'admin@example.com',
        },
      };
      const mockExportData = {
        data: Buffer.from('{"test": "data"}'),
        filename: 'course-123-1234567890.json',
        mimeType: 'application/json',
      };
      mockExportService.exportCourse.mockResolvedValueOnce(mockExportData);
      const res = mockResponse();
      const query = { format: ExportFormat.JSON };

      // Act
      await controller.exportCourse(mockCourseId, query, adminContext as any, res);

      // Assert
      expect(exportService.exportCourse).toHaveBeenCalledWith(
        mockCourseId,
        'admin-123',
        UserRole.ADMIN,
        ExportFormat.JSON,
      );
    });
  });

  describe('importCourse', () => {
    const mockUserId = 'user-123';
    const mockContext = {
      user: {
        id: mockUserId,
        role: UserRole.INSTRUCTOR,
        email: 'test@example.com',
      },
    };

    it('should import course successfully', async () => {
      // Arrange
      const validExportData = {
        version: '1.0.0',
        exportedAt: '2024-01-01T00:00:00.000Z',
        course: {
          title: 'Test Course',
          description: 'Test Description',
          language: 'EN',
          status: 'PUBLISHED',
          enrollmentStart: null,
          enrollmentEnd: null,
          courseStart: null,
          courseEnd: null,
        },
        modules: [],
        tabs: [],
      };
      const base64Data = Buffer.from(JSON.stringify(validExportData)).toString('base64');
      const dto = { data: base64Data };
      const mockResult = {
        success: true,
        courseId: 'new-course-123',
        errors: [],
        warnings: [],
      };
      mockImportService.importCourse.mockResolvedValueOnce(mockResult);

      // Act
      const result = await controller.importCourse(dto, mockContext as any);

      // Assert
      expect(importService.importCourse).toHaveBeenCalledWith(
        JSON.stringify(validExportData),
        mockUserId,
      );
      expect(result.success).toBe(true);
      expect(result.courseId).toBe('new-course-123');
    });

    it('should return error for invalid base64', async () => {
      // Arrange
      const dto = { data: 'not-valid-base64!!!' };

      // Act
      const result = await controller.importCourse(dto, mockContext as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_BASE64');
      expect(importService.importCourse).not.toHaveBeenCalled();
    });

    it('should pass validation errors from import service', async () => {
      // Arrange
      const invalidData = { invalid: 'data' };
      const base64Data = Buffer.from(JSON.stringify(invalidData)).toString('base64');
      const dto = { data: base64Data };
      const mockResult = {
        success: false,
        errors: [
          { field: 'version', message: 'Missing version', code: 'MISSING_VERSION' },
        ],
        warnings: [],
      };
      mockImportService.importCourse.mockResolvedValueOnce(mockResult);

      // Act
      const result = await controller.importCourse(dto, mockContext as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('MISSING_VERSION');
    });

    it('should return warnings from import service', async () => {
      // Arrange
      const validData = {
        version: '1.0.0',
        course: {
          title: 'Test',
          language: 'EN',
          status: 'DRAFT',
        },
        modules: [],
      };
      const base64Data = Buffer.from(JSON.stringify(validData)).toString('base64');
      const dto = { data: base64Data };
      const mockResult = {
        success: true,
        courseId: 'new-course-123',
        errors: [],
        warnings: [
          { field: 'tabs', message: 'Missing tabs', code: 'MISSING_TABS' },
        ],
      };
      mockImportService.importCourse.mockResolvedValueOnce(mockResult);

      // Act
      const result = await controller.importCourse(dto, mockContext as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('MISSING_TABS');
    });

    it('should pass user ID to import service', async () => {
      // Arrange
      const adminContext = {
        user: {
          id: 'admin-123',
          role: UserRole.ADMIN,
          email: 'admin@example.com',
        },
      };
      const validData = {
        version: '1.0.0',
        course: { title: 'Test', language: 'EN', status: 'DRAFT' },
        modules: [],
        tabs: [],
      };
      const base64Data = Buffer.from(JSON.stringify(validData)).toString('base64');
      const dto = { data: base64Data };
      const mockResult = {
        success: true,
        courseId: 'new-course-123',
        errors: [],
        warnings: [],
      };
      mockImportService.importCourse.mockResolvedValueOnce(mockResult);

      // Act
      await controller.importCourse(dto, adminContext as any);

      // Assert
      expect(importService.importCourse).toHaveBeenCalledWith(
        JSON.stringify(validData),
        'admin-123',
      );
    });
  });
});
