import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException, Module } from '@nestjs/common';
import { CertificateModule } from './certificate.module';
import { PrismaService } from '../shared/prisma/prisma.service';
import { CertificateService } from './services/certificate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { NotificationModule } from '../notification/notification.module';
import { NotificationService } from '../notification/services/notification.service';

/** Avoid Bull/Redis from real NotificationModule in integration tests */
@Module({
  providers: [
    {
      provide: NotificationService,
      useValue: {
        sendCertificateEmail: jest.fn().mockResolvedValue(undefined),
      },
    },
  ],
  exports: [NotificationService],
})
class CertificateTestNotificationModule {}

describe('CertificateModule Integration', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService;
  let certificateService: CertificateService;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CertificateModule],
    })
      .overrideModule(NotificationModule)
      .useModule(CertificateTestNotificationModule)
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    certificateService = moduleFixture.get<CertificateService>(CertificateService);
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
    expect(prisma).toBeDefined();
    expect(certificateService).toBeDefined();
  });

  describe('Complete Certificate Generation Flow', () => {
    const mockUser = {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    const mockCourse = {
      id: 'course-1',
      title: 'Complete Course',
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

    it('should complete full flow: enrollment -> completion -> certificate', async () => {
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

      const certificate = await certificateService.generateCertificate(
        'user-1',
        'course-1',
      );

      expect(certificate).toBeDefined();
      expect(certificate.certificateId).toMatch(/^CERT-/);
      expect(certificate.learnerName).toBe('John Doe');
      expect(certificate.courseTitle).toBe('Complete Course');
    });

    it('should generate PDF after certificate creation', async () => {
      const mockCertificate = {
        id: 'cert-1',
        certificateId: 'CERT-12345678',
        userId: 'user-1',
        courseId: 'course-1',
        issuedAt: new Date(),
        user: mockUser,
        course: mockCourse,
      };

      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const pdfBuffer = await certificateService.generateCertificatePDF('cert-1');

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should verify certificate after generation', async () => {
      const mockCertificate = {
        certificateId: 'CERT-12345678',
        user: mockUser,
        course: mockCourse,
        issuedAt: new Date(),
      };

      mockPrismaService.certificate.findUnique.mockResolvedValue(mockCertificate);

      const verification = await certificateService.verifyCertificate(
        'CERT-12345678',
      );

      expect(verification.valid).toBe(true);
      expect(verification.certificateId).toBe('CERT-12345678');
      expect(verification.learnerName).toBe('John Doe');
    });
  });

  describe('Automatic Certificate Generation on 100% Progress', () => {
    it('should allow certificate generation when progress reaches 100%', async () => {
      const mockUser = {
        id: 'user-2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      };

      const mockCourse = {
        id: 'course-2',
        title: 'Auto Certificate Course',
        language: 'EN',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true, quiz: null },
              { id: 'content-2', mandatory: true, quiz: null },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(2);
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);
      mockPrismaService.certificate.create.mockResolvedValue({
        id: 'cert-2',
        certificateId: 'CERT-87654321',
        userId: 'user-2',
        courseId: 'course-2',
        issuedAt: new Date(),
      });

      const canGenerate = await certificateService.canGenerateCertificate(
        'user-2',
        'course-2',
      );

      expect(canGenerate).toBe(true);

      const certificate = await certificateService.generateCertificate(
        'user-2',
        'course-2',
      );

      expect(certificate).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle course with no quizzes', async () => {
      const mockUser = {
        id: 'user-3',
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@example.com',
      };

      const mockCourse = {
        id: 'course-3',
        title: 'No Quiz Course',
        language: 'FR',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true, quiz: null },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.certificate.findUnique.mockResolvedValue(null);
      mockPrismaService.certificate.create.mockResolvedValue({
        id: 'cert-3',
        certificateId: 'CERT-NOQUIZ1',
        userId: 'user-3',
        courseId: 'course-3',
        issuedAt: new Date(),
      });

      const certificate = await certificateService.generateCertificate(
        'user-3',
        'course-3',
      );

      expect(certificate).toBeDefined();
    });

    it('should reject incomplete course', async () => {
      const mockUser = {
        id: 'user-4',
        firstName: 'Alice',
        lastName: 'Brown',
        email: 'alice@example.com',
      };

      const mockCourse = {
        id: 'course-4',
        title: 'Incomplete Course',
        language: 'EN',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true, quiz: null },
              { id: 'content-2', mandatory: true, quiz: null },
            ],
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);

      await expect(
        certificateService.generateCertificate('user-4', 'course-4'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle duplicate generation attempts', async () => {
      const mockUser = {
        id: 'user-5',
        firstName: 'Charlie',
        lastName: 'Davis',
        email: 'charlie@example.com',
      };

      const mockCourse = {
        id: 'course-5',
        title: 'Duplicate Test Course',
        language: 'EN',
        modules: [
          {
            id: 'module-1',
            contentItems: [
              { id: 'content-1', mandatory: true, quiz: null },
            ],
          },
        ],
      };

      const existingCertificate = {
        id: 'cert-5',
        certificateId: 'CERT-EXISTING',
        userId: 'user-5',
        courseId: 'course-5',
        issuedAt: new Date('2024-01-01'),
        pdfUrl: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.progress.count.mockResolvedValue(1);
      mockPrismaService.certificate.findUnique.mockResolvedValue(existingCertificate);

      const certificate = await certificateService.generateCertificate(
        'user-5',
        'course-5',
      );

      expect(certificate.certificateId).toBe('CERT-EXISTING');
      expect(mockPrismaService.certificate.create).not.toHaveBeenCalled();
    });
  });
});
