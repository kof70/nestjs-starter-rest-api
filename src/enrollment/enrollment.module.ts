import { Module } from '@nestjs/common';
import { EnrollmentService } from './services/enrollment.service';
import { EnrollmentController } from './controllers/enrollment.controller';
import { SharedModule } from '../shared/shared.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [SharedModule, NotificationModule],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
