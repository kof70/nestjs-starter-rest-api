import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { VideoService } from './video.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { VideoQuality } from '../dtos/update-quality.dto';

describe('VideoService', () => {
  let service: VideoService;
  let prisma: PrismaService;

  const mockPrismaService = {
    video: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    videoView: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    contentItem: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'instructor@test.com',
    role: UserRole.INSTRUCTOR,
  };

  const mockVideo = {
    id: 'video-123',
    contentItemId: 'content-123',
    title: 'Test Video',
    description: 'Test description',
    duration: 300,
    format: 'MP4',
    thumbnailUrl: null,
    youtubeUrl: null,
    uploadUrl: '/api/videos/files/course-123/video.mp4',
    uploaderId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VideoService>(VideoService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadThumbnail', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'thumbnail.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024 * 1024,
      buffer: Buffer.from('test'),
    };

    it('should upload thumbnail successfully', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputUserId = 'user-123';
      const expectedVideo = { ...mockVideo, thumbnailUrl: '/api/videos/video-123/thumbnail' };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.video.update.mockResolvedValue(expectedVideo);

      // Act
      const actualResult = await service.uploadThumbnail(inputVideoId, mockFile, inputUserId);

      // Assert
      expect(actualResult.thumbnailUrl).toBe('/api/videos/video-123/thumbnail');
      expect(mockPrismaService.video.update).toHaveBeenCalledWith({
        where: { id: inputVideoId },
        data: { thumbnailUrl: '/api/videos/video-123/thumbnail' },
      });
    });

    it('should throw BadRequestException for invalid thumbnail format', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputUserId = 'user-123';
      const invalidFile = { ...mockFile, mimetype: 'image/bmp' };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.uploadThumbnail(inputVideoId, invalidFile, inputUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for thumbnail exceeding size limit', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputUserId = 'user-123';
      const largeFile = { ...mockFile, size: 3 * 1024 * 1024 };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.uploadThumbnail(inputVideoId, largeFile, inputUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when video not found', async () => {
      // Arrange
      const inputVideoId = 'nonexistent-video';
      const inputUserId = 'user-123';
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.uploadThumbnail(inputVideoId, mockFile, inputUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return video thumbnail URL when available', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const videoWithThumbnail = { ...mockVideo, thumbnailUrl: '/thumbnails/video-123.jpg' };
      mockPrismaService.video.findUnique.mockResolvedValue(videoWithThumbnail);

      // Act
      const actualUrl = await service.getThumbnailUrl(inputVideoId);

      // Assert
      expect(actualUrl).toBe('/thumbnails/video-123.jpg');
    });

    it('should return default thumbnail URL when no thumbnail', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);

      // Act
      const actualUrl = await service.getThumbnailUrl(inputVideoId);

      // Assert
      expect(actualUrl).toBe('/assets/default-video-thumbnail.png');
    });
  });

  describe('getDefaultThumbnail', () => {
    it('should return default thumbnail URL', () => {
      // Act
      const actualUrl = service.getDefaultThumbnail();

      // Assert
      expect(actualUrl).toBe('/assets/default-video-thumbnail.png');
    });
  });

  describe('trackVideoView', () => {
    it('should track video view successfully', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputUserId = 'user-123';
      const mockVideoView = {
        id: 'view-123',
        videoId: inputVideoId,
        userId: inputUserId,
        viewedAt: new Date(),
      };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.videoView.create.mockResolvedValue(mockVideoView);

      // Act
      const actualResult = await service.trackVideoView(inputVideoId, inputUserId);

      // Assert
      expect(actualResult.videoId).toBe(inputVideoId);
      expect(actualResult.userId).toBe(inputUserId);
      expect(mockPrismaService.videoView.create).toHaveBeenCalledWith({
        data: {
          videoId: inputVideoId,
          userId: inputUserId,
        },
      });
    });

    it('should throw NotFoundException when video not found', async () => {
      // Arrange
      const inputVideoId = 'nonexistent-video';
      const inputUserId = 'user-123';
      mockPrismaService.video.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.trackVideoView(inputVideoId, inputUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVideoViews', () => {
    it('should return video statistics', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.videoView.count.mockResolvedValue(10);
      mockPrismaService.videoView.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ]);

      // Act
      const actualStats = await service.getVideoViews(inputVideoId);

      // Assert
      expect(actualStats.videoId).toBe(inputVideoId);
      expect(actualStats.totalViews).toBe(10);
      expect(actualStats.uniqueViewers).toBe(3);
    });
  });

  describe('getUserVideoViews', () => {
    it('should return user view count for video', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputUserId = 'user-123';
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.videoView.count.mockResolvedValue(5);

      // Act
      const actualCount = await service.getUserVideoViews(inputVideoId, inputUserId);

      // Assert
      expect(actualCount).toBe(5);
      expect(mockPrismaService.videoView.count).toHaveBeenCalledWith({
        where: {
          videoId: inputVideoId,
          userId: inputUserId,
        },
      });
    });
  });

  describe('updateVideoQuality', () => {
    it('should update video quality successfully', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputQuality = VideoQuality.HD;
      const inputUserId = 'user-123';
      const expectedVideo = { ...mockVideo, format: 'HD' };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.video.update.mockResolvedValue(expectedVideo);

      // Act
      const actualResult = await service.updateVideoQuality(inputVideoId, inputQuality, inputUserId);

      // Assert
      expect(actualResult.format).toBe('HD');
      expect(mockPrismaService.video.update).toHaveBeenCalledWith({
        where: { id: inputVideoId },
        data: { format: 'HD' },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputQuality = VideoQuality.HD;
      const inputUserId = 'other-user';
      const otherUser = { ...mockUser, id: 'other-user' };
      mockPrismaService.video.findUnique.mockResolvedValue(mockVideo);
      mockPrismaService.user.findUnique.mockResolvedValue(otherUser);

      // Act & Assert
      await expect(
        service.updateVideoQuality(inputVideoId, inputQuality, inputUserId),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
