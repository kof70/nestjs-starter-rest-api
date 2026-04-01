import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CourseModule } from '../course/course.module';
import { QuizModule } from '../quiz/quiz.module';
import { AssetModule } from '../asset/asset.module';
import { VideoModule } from '../video/video.module';
import { TabModule } from '../tab/tab.module';
import { ExportService } from './services/export.service';
import { ImportService } from './services/import.service';
import { ExportController } from './controllers/export.controller';

/**
 * Export/Import module for course backup and migration
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
 */
@Module({
  imports: [
    SharedModule,
    CourseModule,
    QuizModule,
    AssetModule,
    VideoModule,
    TabModule,
  ],
  controllers: [ExportController],
  providers: [ExportService, ImportService],
  exports: [ExportService, ImportService],
})
export class ExportImportModule {}
