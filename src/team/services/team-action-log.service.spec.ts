import { Test, TestingModule } from '@nestjs/testing';
import { TeamActionLogService } from './team-action-log.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

describe('TeamActionLogService', () => {
  let service: TeamActionLogService;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      courseTeam: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamActionLogService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeamActionLogService>(TeamActionLogService);
  });

  describe('logAction', () => {
    it('should log action and update last activity', async () => {
      const inputParams = {
        courseId: 'course-1',
        userId: 'user-1',
        action: 'updated module',
        details: 'Changed title',
      };
      const mockTeamMember = { id: 'team-1', courseId: 'course-1', userId: 'user-1' };
      mockPrismaService.courseTeam.findUnique.mockResolvedValue(mockTeamMember as any);
      mockPrismaService.courseTeam.update.mockResolvedValue({} as any);
      await service.logAction(inputParams);
      expect(mockPrismaService.courseTeam.findUnique).toHaveBeenCalledWith({
        where: {
          courseId_userId: {
            courseId: 'course-1',
            userId: 'user-1',
          },
        },
      });
      expect(mockPrismaService.courseTeam.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should not update activity if team member not found', async () => {
      const inputParams = {
        courseId: 'course-1',
        userId: 'user-1',
        action: 'updated module',
      };
      mockPrismaService.courseTeam.findUnique.mockResolvedValue(null);
      await service.logAction(inputParams);
      expect(mockPrismaService.courseTeam.update).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const inputParams = {
        courseId: 'course-1',
        userId: 'user-1',
        action: 'updated module',
      };
      mockPrismaService.courseTeam.findUnique.mockRejectedValue(
        new Error('Database error'),
      );
      await expect(service.logAction(inputParams)).resolves.not.toThrow();
    });
  });
});
