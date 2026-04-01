import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationService } from '../services/notification.service';

/**
 * Bulk email processor for async queue processing
 * Requirements: 17.8
 */
interface BulkEmailJob {
  userIds: string[];
  subject: string;
  content: string;
}

@Processor('bulk-email')
export class BulkEmailProcessor {
  private readonly logger = new Logger(BulkEmailProcessor.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Process bulk email job
   * Requirements: 17.8
   */
  @Process('send-bulk')
  async handleBulkEmail(job: Job<BulkEmailJob>): Promise<void> {
    const { userIds, subject, content } = job.data;
    this.logger.log(
      `Processing bulk email job ${job.id} for ${userIds.length} users`,
    );

    try {
      await this.notificationService.processBulkEmailSync(
        userIds,
        subject,
        content,
      );
      this.logger.log(`Completed bulk email job ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process bulk email job ${job.id}:`, error);
      throw error;
    }
  }
}
