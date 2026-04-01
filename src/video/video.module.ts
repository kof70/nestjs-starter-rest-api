import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { VideoService } from './services/video.service';
import { VideoController } from './controllers/video.controller';

/**
 * Video module for video upload and metadata management
 * Requirements: 19.1, 19.2, 19.5, 19.6, 19.7
 */
@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max for videos
      },
    }),
  ],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule {}
