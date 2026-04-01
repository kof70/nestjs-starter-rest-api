import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { NotificationService } from './services/notification.service';
import { NotificationController } from './controllers/notification.controller';
import { BulkEmailProcessor } from './processors/bulk-email.processor';
import { QuizReminderScheduler } from './services/quiz-reminder.scheduler';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'bulk-email',
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, BulkEmailProcessor, QuizReminderScheduler],
  exports: [NotificationService],
})
export class NotificationModule {}
