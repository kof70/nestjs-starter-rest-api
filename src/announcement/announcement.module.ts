import { Module } from '@nestjs/common';
import { AnnouncementController } from './controllers/announcement.controller';
import { AnnouncementService } from './services/announcement.service';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * Announcement module for course announcement management
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8, 21.9, 21.10, 21.11
 */
@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
