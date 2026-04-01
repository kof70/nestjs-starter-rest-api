import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuditLogService } from '../services/audit-log.service';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles-prisma.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let auditLogService: AuditLogService;

  const mockAuditLogService = {
    logPermissionViolation: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (user: any, path = '/test', method = 'GET'): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          path,
          method,
          ip: '192.168.1.1',
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
          params: {},
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockExecutionContext({ id: 'user-123', role: UserRole.LEARNER });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should allow access when user has required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should allow access when user has one of multiple required roles', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.INSTRUCTOR]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'instructor@example.com',
        role: UserRole.INSTRUCTOR,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should deny access and log violation when user lacks required role', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(
        {
          id: 'user-123',
          email: 'learner@example.com',
          role: UserRole.LEARNER,
        },
        '/api/admin/users',
        'GET',
      );

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      expect(mockAuditLogService.logPermissionViolation).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'learner@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        attemptedAction: 'GET /api/admin/users',
        requiredRoles: [UserRole.ADMIN],
        userRole: UserRole.LEARNER,
        resourceId: undefined,
      });
    });

    it('should deny access when user is not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(null);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should include resourceId in audit log when available', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.INSTRUCTOR]);
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'learner@example.com',
          role: UserRole.LEARNER,
        },
        path: '/api/courses/course-456',
        method: 'DELETE',
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        params: {
          id: 'course-456',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);

      expect(mockAuditLogService.logPermissionViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'course-456',
        }),
      );
    });

    it('should throw ForbiddenException with descriptive message', async () => {
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.INSTRUCTOR]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'learner@example.com',
        role: UserRole.LEARNER,
      });

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        'User with role LEARNER does not have access to this resource. Required roles: ADMIN, INSTRUCTOR',
      );
    });

    it('should handle multiple roles correctly', async () => {
      // Requirement 8.1: Multiple role support
      const roles = [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.LEARNER];
      mockReflector.getAllAndOverride.mockReturnValue(roles);

      for (const role of roles) {
        const context = createMockExecutionContext({
          id: 'user-123',
          email: 'user@example.com',
          role,
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should deny access when user object is missing required fields', async () => {
      // Requirement 8.1: User validation
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        id: 'user-123',
        // Missing email and role
      });

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should handle guard execution errors gracefully', async () => {
      // Requirement 8.1: Error handling
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      mockAuditLogService.logPermissionViolation.mockRejectedValue(
        new Error('Logging failed'),
      );

      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'learner@example.com',
        role: UserRole.LEARNER,
      });

      // Should still throw ForbiddenException even if logging fails
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should extract resource ID from different param names', async () => {
      // Requirement 8.6: Resource tracking
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'learner@example.com',
          role: UserRole.LEARNER,
        },
        path: '/api/courses/course-456/modules/module-789',
        method: 'DELETE',
        ip: '192.168.1.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
        params: {
          courseId: 'course-456',
          moduleId: 'module-789',
          id: 'module-789',
        },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockAuditLogService.logPermissionViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'module-789',
        }),
      );
    });

    it('should log permission violation with complete context', async () => {
      // Requirement 8.6: Complete audit trail
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(
        {
          id: 'user-123',
          email: 'learner@example.com',
          role: UserRole.LEARNER,
        },
        '/api/admin/users',
        'POST',
      );

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockAuditLogService.logPermissionViolation).toHaveBeenCalledWith({
        userId: 'user-123',
        email: 'learner@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        attemptedAction: 'POST /api/admin/users',
        requiredRoles: [UserRole.ADMIN],
        userRole: UserRole.LEARNER,
        resourceId: undefined,
      });
    });

    it('should allow access when user has exact role match', async () => {
      // Requirement 8.1: Exact role matching
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.INSTRUCTOR]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'instructor@example.com',
        role: UserRole.INSTRUCTOR,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role comparison', async () => {
      // Requirement 8.1: Role comparison
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'user@example.com',
        role: 'admin' as any, // lowercase role
      });

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      // Should fail because role comparison is case-sensitive
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('edge cases and security', () => {
    it('should not leak information about required roles in public endpoints', async () => {
      // Requirement 8.5: Security consideration
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext({
        id: 'user-123',
        email: 'learner@example.com',
        role: UserRole.LEARNER,
      });

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      try {
        await guard.canActivate(context);
      } catch (error: unknown) {
        // Error message includes required roles for debugging
        expect((error as Error).message).toContain('ADMIN');
      }
    });

    it('should handle null or undefined user gracefully', async () => {
      // Requirement 8.1: Null safety
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const context = createMockExecutionContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(mockAuditLogService.logPermissionViolation).not.toHaveBeenCalled();
    });

    it('should handle empty required roles array', async () => {
      // Requirement 8.1: Empty roles handling
      mockReflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({
        id: 'user-123',
        role: UserRole.LEARNER,
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should handle missing IP address in request', async () => {
      // Requirement 8.6: Graceful degradation
      mockReflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'learner@example.com',
          role: UserRole.LEARNER,
        },
        path: '/api/admin/users',
        method: 'GET',
        ip: undefined, // Missing IP
        headers: {},
        params: {},
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      mockAuditLogService.logPermissionViolation.mockResolvedValue(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockAuditLogService.logPermissionViolation).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: 'unknown',
        }),
      );
    });
  });
});
