import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotificationService } from './notification.service';

/**
 * Quiz reminder scheduler service
 * Requirements: 17.4
 */
@Injectable()
export class QuizReminderScheduler {
  private readonly logger = new Logger(QuizReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Check for quiz deadlines and send reminders
   * Runs daily at 9:00 AM
   * Requirements: 17.4
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkQuizDeadlines(): Promise<void> {
    this.logger.log('Running quiz deadline check');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    try {
      const quizzesWithDeadlines = await this.findQuizzesWithUpcomingDeadlines(
        tomorrow,
        dayAfterTomorrow,
      );
      this.logger.log(`Found ${quizzesWithDeadlines.length} quizzes with upcoming deadlines`);
      for (const quiz of quizzesWithDeadlines) {
        await this.sendRemindersForQuiz(quiz);
      }
      this.logger.log('Quiz deadline check completed');
    } catch (error) {
      this.logger.error('Failed to check quiz deadlines:', error);
    }
  }

  /**
   * Find quizzes with deadlines in the next 24 hours
   * Requirements: 17.4
   */
  private async findQuizzesWithUpcomingDeadlines(
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return this.prisma.quiz.findMany({
      where: {
        deadline: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        contentItem: {
          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Send reminders to enrolled learners for a quiz
   * Requirements: 17.4
   */
  private async sendRemindersForQuiz(quiz: any): Promise<void> {
    if (!quiz.contentItem?.module?.course) {
      this.logger.warn(`Quiz ${quiz.id} has no associated course`);
      return;
    }
    const courseId = quiz.contentItem.module.course.id;
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        courseId,
        status: 'ACTIVE',
      },
      include: {
        user: true,
      },
    });
    this.logger.log(`Sending quiz reminders to ${enrollments.length} learners for quiz ${quiz.id}`);
    if (!quiz.deadline) {
      return;
    }
    const deadline = quiz.deadline;
    for (const enrollment of enrollments) {
      try {
        await this.notificationService.sendQuizReminderEmail(
          enrollment.userId,
          courseId,
          quiz.contentItem?.title || 'Quiz',
          deadline,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send quiz reminder to user ${enrollment.userId}:`,
          error,
        );
      }
    }
  }
}
