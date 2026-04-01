import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { I18nModule, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './article/article.module';
import { AuthModule } from './auth/auth.module';
import { AuthPrismaModule } from './auth/auth-prisma.module';
import { SharedModule } from './shared/shared.module';
import { UserModule } from './user/user.module';
import { CourseModule } from './course/course.module';
import { QuizModule } from './quiz/quiz.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { ProgressModule } from './progress/progress.module';
import { CertificateModule } from './certificate/certificate.module';
import { GradingModule } from './grading/grading.module';
import { AssetModule } from './asset/asset.module';
import { VideoModule } from './video/video.module';
import { NotificationModule } from './notification/notification.module';
import { TabModule } from './tab/tab.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { TeamModule } from './team/team.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportImportModule } from './export-import/export-import.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ScheduleModule.forRoot(),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        new HeaderResolver(['x-language']),
        AcceptLanguageResolver,
      ],
    }),
    SharedModule,
    UserModule,
    AuthModule,
    AuthPrismaModule,
    ArticleModule,
    CourseModule,
    QuizModule,
    EnrollmentModule,
    ProgressModule,
    CertificateModule,
    GradingModule,
    AssetModule,
    VideoModule,
    NotificationModule,
    TabModule,
    AnnouncementModule,
    TeamModule,
    DashboardModule,
    ExportImportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
