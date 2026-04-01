import { Test, TestingModule } from '@nestjs/testing';
import { CertificateService } from './certificate.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/services/notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('CertificateService', () => {
  let service: CertificateService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    certificate: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    progress: {
      count: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  const mockCourse = {
    id: 'course-1',
    title: 'Test Course',
    language: 'EN',
    modules: [
      {
        id: 'module-1',
        contentItems: [
          {
            id: 'content-1',
            mandatory: true,
            quiz: {
              id: 'quiz-1',
              passingScore: 70,
            },
          },
        ],
      },
    ],
  };

  const mockCourseNoQuizzes = {
    id: 'course-2',
    title: 'Course Without Quizzes',
    language: 'FR',
    modules: [
      {
        id: 'module-2',
        contentItems: [
          {
            id: 'content-2',
            mandatory: true,
            quiz: null,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: {
            sendCertificateEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCertificate', () => {
    it('should generate certificate for completed course with passing scores', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 80, userId: 'user-1', quizId: 'quiz-1' },
      ]);
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);
      mockPrismaService.certificate.create.mockResolvedValue({
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        userId: 'user-1',
        courseId: 'course-1',
        issuedAt: new Date(),
      });

      const actualResult = await service.generateCertificate('user-1', 'course-1');

      expect(actualResult).toHaveProperty('certificateId');
      expect(actualResult.certificateId).toMatch(/^CERT-/);
      expect(mockPrismaService.certificate.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCertificate('user-1', 'course-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.certificate.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when course not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCertificate('user-1', 'course-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when course not completed', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(0);

      await expect(
        service.generateCertificate('user-1', 'course-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.certificate.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when passing score not achieved', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 50, userId: 'user-1', quizId: 'quiz-1' },
      ]);

      await expect(
        service.generateCertificate('user-1', 'course-1'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.certificate.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when quiz not attempted', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([]);

      await expect(
        service.generateCertificate('user-1', 'course-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should generate certificate for course without quizzes', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourseNoQuizzes);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);
      mockPrismaService.certificate.create.mockResolvedValue({
        id: 'cert-2',
        certificateId: 'CERT-87654321',
        userId: 'user-1',
        courseId: 'course-2',
        issuedAt: new Date(),
      });

      const actualResult = await service.generateCertificate('user-1', 'course-2');

      expect(actualResult).toHaveProperty('certificateId');
      expect(mockPrismaService.certificate.create).toHaveBeenCalled();
    });

    it('should return existing certificate if already generated (idempotent)', async () => {
      const existingCertificate = {
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        userId: 'user-1',
        courseId: 'course-1',
        issuedAt: new Date('2024-01-01'),
        pdfUrl: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 80, userId: 'user-1', quizId: 'quiz-1' },
      ]);
      mockPrismaService.certificate.findUnique.mockResolvedValue(existingCertificate);

      const actualResult = await service.generateCertificate('user-1', 'course-1');

      expect(actualResult.certificateId).toBe('CERT-12345678');
      expect(mockPrismaService.certificate.create).not.toHaveBeenCalled();
    });

    it('should use best quiz score from multiple attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 85, userId: 'user-1', quizId: 'quiz-1' },
      ]);
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);
      mockPrismaService.certificate.create.mockResolvedValue({
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        userId: 'user-1',
        courseId: 'course-1',
        issuedAt: new Date(),
      });

      const actualResult = await service.generateCertificate('user-1', 'course-1');

      expect(actualResult).toHaveProperty('certificateId');
      expect(mockPrismaService.certificate.create).toHaveBeenCalled();
    });
  });

  describe('verifyCertificate', () => {
    it('should verify valid certificate', async () => {
      const mockCertificate = {
        certificateId: 'CERT-12345678',
        user: mockUser,
        course: mockCourse,
        issuedAt: new Date('2024-01-01'),
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualResult = await service.verifyCertificate('CERT-12345678');

      expect(actualResult).toEqual({
        certificateId: 'CERT-12345678',
        learnerName: 'John Doe',
        courseTitle: 'Test Course',
        issuedAt: mockCertificate.issuedAt,
        valid: true,
      });
    });

    it('should throw NotFoundException for invalid certificate', async () => {
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);

      await expect(service.verifyCertificate('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify certificate with French course', async () => {
      const mockCertificate = {
        certificateId: 'CERT-87654321',
        user: mockUser,
        course: mockCourseNoQuizzes,
        issuedAt: new Date('2024-01-01'),
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualResult = await service.verifyCertificate('CERT-87654321');

      expect(actualResult.valid).toBe(true);
      expect(actualResult.courseTitle).toBe('Course Without Quizzes');
    });
  });

  describe('generateCertificatePDF', () => {
    it('should generate PDF buffer for certificate', async () => {
      const mockCertificate = {
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        user: mockUser,
        course: mockCourse,
        issuedAt: new Date('2024-01-01'),
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualPdfBuffer = await service.generateCertificatePDF('cert-1');

      expect(actualPdfBuffer).toBeInstanceOf(Buffer);
      expect(actualPdfBuffer.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when certificate not found', async () => {
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);

      await expect(service.generateCertificatePDF('cert-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should generate PDF with French language template', async () => {
      const mockCertificate = {
        id: 'cert-2',
        certificateId: 'CERT-87654321',
        user: mockUser,
        course: mockCourseNoQuizzes,
        issuedAt: new Date('2024-01-01'),
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualPdfBuffer = await service.generateCertificatePDF('cert-2');

      expect(actualPdfBuffer).toBeInstanceOf(Buffer);
      expect(actualPdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include certificate ID in PDF', async () => {
      const mockCertificate = {
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        user: mockUser,
        course: mockCourse,
        issuedAt: new Date('2024-01-01'),
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualPdfBuffer = await service.generateCertificatePDF('cert-1');

      expect(actualPdfBuffer).toBeInstanceOf(Buffer);
      expect(actualPdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('canGenerateCertificate', () => {
    it('should return true when all conditions met', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 80, userId: 'user-1', quizId: 'quiz-1' },
      ]);

      const actualResult = await service.canGenerateCertificate('user-1', 'course-1');

      expect(actualResult).toBe(true);
    });

    it('should return false when course not completed', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(0);

      const actualResult = await service.canGenerateCertificate('user-1', 'course-1');

      expect(actualResult).toBe(false);
    });

    it('should return false when passing score not met', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.quizAttempt.findMany.mockResolvedValue([
        { score: 50, userId: 'user-1', quizId: 'quiz-1' },
      ]);

      const actualResult = await service.canGenerateCertificate('user-1', 'course-1');

      expect(actualResult).toBe(false);
    });

    it('should return false when course not found', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      const actualResult = await service.canGenerateCertificate('user-1', 'course-1');

      expect(actualResult).toBe(false);
    });

    it('should return true for course without quizzes', async () => {
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourseNoQuizzes);
      mockPrismaService.progress.count.mockResolvedValue(1);

      const actualResult = await service.canGenerateCertificate('user-1', 'course-2');

      expect(actualResult).toBe(true);
    });
  });

  describe('getCertificateById', () => {
    it('should return certificate by ID', async () => {
      const mockCertificate = {
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        userId: 'user-1',
        courseId: 'course-1',
        issuedAt: new Date('2024-01-01'),
        pdfUrl: null,
        user: mockUser,
        course: mockCourse,
      };
      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const actualResult = await service.getCertificateById('cert-1');

      expect(actualResult.id).toBe('cert-1');
      expect(actualResult.certificateId).toBe('CERT-12345678');
      expect(actualResult.learnerName).toBe('John Doe');
      expect(actualResult.courseTitle).toBe('Test Course');
    });

    it('should throw NotFoundException when certificate not found', async () => {
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);

      await expect(service.getCertificateById('cert-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserCertificates', () => {
    it('should return all certificates for user', async () => {
      const mockCertificates = [
        {
          id: 'cert-1',
          certificateId: 'CERT-12345678',
          userId: 'user-1',
          courseId: 'course-1',
          issuedAt: new Date('2024-01-01'),
          pdfUrl: null,
          user: mockUser,
          course: mockCourse,
        },
        {
          id: 'cert-2',
          certificateId: 'CERT-87654321',
          userId: 'user-1',
          courseId: 'course-2',
          issuedAt: new Date('2024-01-02'),
          pdfUrl: null,
          user: mockUser,
          course: mockCourseNoQuizzes,
        },
      ];
      mockPrismaService.certificate.findMany.mockResolvedValue(mockCertificates);

      const actualResult = await service.getUserCertificates('user-1');

      expect(actualResult).toHaveLength(2);
      expect(actualResult[0].certificateId).toBe('CERT-12345678');
      expect(actualResult[1].certificateId).toBe('CERT-87654321');
    });

    it('should return empty array when user has no certificates', async () => {
      mockPrismaService.certificate.findMany.mockResolvedValue([]);

      const actualResult = await service.getUserCertificates('user-1');

      expect(actualResult).toHaveLength(0);
    });
  });

  describe('getCourseCertificates', () => {
    it('should return all certificates for course', async () => {
      const mockCertificates = [
        {
          id: 'cert-1',
          certificateId: 'CERT-12345678',
          userId: 'user-1',
          courseId: 'course-1',
          issuedAt: new Date('2024-01-01'),
          pdfUrl: null,
          user: mockUser,
          course: mockCourse,
        },
      ];
      mockPrismaService.certificate.findMany.mockResolvedValue(mockCertificates);

      const actualResult = await service.getCourseCertificates('course-1');

      expect(actualResult).toHaveLength(1);
      expect(actualResult[0].courseId).toBe('course-1');
    });

    it('should return empty array when course has no certificates', async () => {
      mockPrismaService.certificate.findMany.mockResolvedValue([]);

      const actualResult = await service.getCourseCertificates('course-1');

      expect(actualResult).toHaveLength(0);
    });
  });
});
