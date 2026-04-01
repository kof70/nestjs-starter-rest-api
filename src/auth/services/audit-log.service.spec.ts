import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logAuthAttempt', () => {
    it('should log successful authentication attempt', async () => {
      const authLog = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: true,
      };

      mockPrismaService.notificationLog.create.mockResolvedValue({
        id: 'log-123',
        userId: authLog.userId,
        type: 'AUTH_ATTEMPT',
        subject: 'Login Success',
        content: JSON.stringify({
          email: authLog.email,
          ipAddress: authLog.ipAddress,
          userAgent: authLog.userAgent,
          success: true,
          timestamp: expect.any(String),
        }),
        deliveryStatus: 'logged',
      });

      await service.logAuthAttempt(authLog);

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          userId: authLog.userId,
          type: 'AUTH_ATTEMPT',
          subject: 'Login Success',
          content: expect.stringContaining(authLog.email),
          deliveryStatus: 'logged',
        },
      });
    });

    it('should log failed authentication attempt', async () => {
      const authLog = {
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: false,
        failureReason: 'Invalid password',
      };

      mockPrismaService.notificationLog.create.mockResolvedValue({
        id: 'log-123',
        userId: 'unknown',
        type: 'AUTH_ATTEMPT',
        subject: 'Login Failed',
        content: JSON.stringify({
          email: authLog.email,
          ipAddress: authLog.ipAddress,
          userAgent: authLog.userAgent,
          success: false,
          failureReason: authLog.failureReason,
          timestamp: expect.any(String),
        }),
        deliveryStatus: 'logged',
      });

      await service.logAuthAttempt(authLog);

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'unknown',
          type: 'AUTH_ATTEMPT',
          subject: 'Login Failed',
          content: expect.stringContaining(authLog.failureReason),
          deliveryStatus: 'logged',
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      const authLog = {
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        success: true,
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrismaService.notificationLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await service.logAuthAttempt(authLog);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log auth attempt:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('logPermissionViolation', () => {
    it('should log permission violation with all details', async () => {
      const violationLog = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        attemptedAction: 'GET /api/admin/users',
        requiredRoles: ['ADMIN'],
        userRole: 'LEARNER',
        resourceId: 'resource-456',
      };

      mockPrismaService.notificationLog.create.mockResolvedValue({
        id: 'log-123',
        userId: violationLog.userId,
        type: 'PERMISSION_VIOLATION',
        subject: 'Unauthorized Access Attempt',
        content: JSON.stringify({
          email: violationLog.email,
          ipAddress: violationLog.ipAddress,
          userAgent: violationLog.userAgent,
          attemptedAction: violationLog.attemptedAction,
          requiredRoles: violationLog.requiredRoles,
          userRole: violationLog.userRole,
          resourceId: violationLog.resourceId,
          timestamp: expect.any(String),
        }),
        deliveryStatus: 'logged',
      });

      await service.logPermissionViolation(violationLog);

      expect(mockPrismaService.notificationLog.create).toHaveBeenCalledWith({
        data: {
          userId: violationLog.userId,
          type: 'PERMISSION_VIOLATION',
          subject: 'Unauthorized Access Attempt',
          content: expect.stringContaining(violationLog.attemptedAction),
          deliveryStatus: 'logged',
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      const violationLog = {
        userId: 'user-123',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        attemptedAction: 'GET /api/admin/users',
        requiredRoles: ['ADMIN'],
        userRole: 'LEARNER',
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockPrismaService.notificationLog.create.mockRejectedValue(
        new Error('Database error'),
      );

      await service.logPermissionViolation(violationLog);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log permission violation:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
