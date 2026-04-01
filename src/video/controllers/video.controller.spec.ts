import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from '../services/video.service';
import { UserRole } from '@prisma/client';
import { VideoQuality } from '../dtos/update-quality.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';

describe('VideoController', () => {
  let controller: VideoController;
  let service: VideoService;

  const mockVideoService = {
    uploadVideo: jest.fn(),
    createYouTubeVideo: jest.fn(),
    getVideoById: jest.fn(),
    generatePresignedUrl: jest.fn(),
    getVideosByCourse: jest.fn(),
    updateVideo: jest.fn(),
    deleteVideo: jest.fn(),
    uploadThumbnail: jest.fn(),
    getThumbnailUrl: jest.fn(),
    trackVideoView: jest.fn(),
    getVideoViews: jest.fn(),
    updateVideoQuality: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      role: UserRole.INSTRUCTOR,
    },
  };

  const mockVideoResponse = {
    id: 'video-123',
    title: 'Test Video',
    description: 'Test description',
    duration: 300,
    format: 'MP4',
    url: '/api/videos/files/course-123/video.mp4',
    contentItemId: 'content-123',
    uploadedBy: 'user-123',
    uploadedAt: new Date(),
    isYouTube: false,
    thumbnailUrl: '/assets/default-video-thumbnail.png',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VideoController],
      providers: [
        {
          provide: VideoService,
          useValue: mockVideoService,
        },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VideoController>(VideoController);
    service = module.get<VideoService>(VideoService);
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
      const expectedResponse = { ...mockVideoResponse, thumbnailUrl: '/thumbnails/video-123.jpg' };
      mockVideoService.uploadThumbnail.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.uploadThumbnail(inputVideoId, mockFile, mockRequest as any);

      // Assert
      expect(actualResult).toEqual(expectedResponse);
      expect(mockVideoService.uploadThumbnail).toHaveBeenCalledWith(
        inputVideoId,
        mockFile,
        mockRequest.user.id,
      );
    });

    it('should throw BadRequestException when file is missing', async () => {
      // Arrange
      const inputVideoId = 'video-123';

      // Act & Assert
      await expect(
        controller.uploadThumbnail(inputVideoId, undefined as any, mockRequest as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getThumbnail', () => {
    it('should return thumbnail URL', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const expectedUrl = '/thumbnails/video-123.jpg';
      mockVideoService.getThumbnailUrl.mockResolvedValue(expectedUrl);

      // Act
      const actualResult = await controller.getThumbnail(inputVideoId);

      // Assert
      expect(actualResult.thumbnailUrl).toBe(expectedUrl);
      expect(mockVideoService.getThumbnailUrl).toHaveBeenCalledWith(inputVideoId);
    });
  });

  describe('trackView', () => {
    it('should track video view successfully', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const expectedView = {
        videoId: inputVideoId,
        userId: mockRequest.user.id,
        viewedAt: new Date(),
      };
      mockVideoService.trackVideoView.mockResolvedValue(expectedView);

      // Act
      const actualResult = await controller.trackView(inputVideoId, mockRequest as any);

      // Assert
      expect(actualResult).toEqual(expectedView);
      expect(mockVideoService.trackVideoView).toHaveBeenCalledWith(
        inputVideoId,
        mockRequest.user.id,
      );
    });
  });

  describe('getVideoViews', () => {
    it('should return video statistics', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const expectedStats = {
        videoId: inputVideoId,
        totalViews: 150,
        uniqueViewers: 45,
      };
      mockVideoService.getVideoViews.mockResolvedValue(expectedStats);

      // Act
      const actualResult = await controller.getVideoViews(inputVideoId);

      // Assert
      expect(actualResult).toEqual(expectedStats);
      expect(mockVideoService.getVideoViews).toHaveBeenCalledWith(inputVideoId);
    });
  });

  describe('updateQuality', () => {
    it('should update video quality successfully', async () => {
      // Arrange
      const inputVideoId = 'video-123';
      const inputDto = { quality: VideoQuality.HD };
      const expectedResponse = { ...mockVideoResponse, format: 'HD' };
      mockVideoService.updateVideoQuality.mockResolvedValue(expectedResponse);

      // Act
      const actualResult = await controller.updateQuality(inputVideoId, inputDto, mockRequest as any);

      // Assert
      expect(actualResult).toEqual(expectedResponse);
      expect(mockVideoService.updateVideoQuality).toHaveBeenCalledWith(
        inputVideoId,
        VideoQuality.HD,
        mockRequest.user.id,
      );
    });
  });
});
