import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AssetService } from './services/asset.service';
import { AssetController } from './controllers/asset.controller';

/**
 * Asset module for file upload and management
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.10
 */
@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max (for documents)
      },
    }),
  ],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
