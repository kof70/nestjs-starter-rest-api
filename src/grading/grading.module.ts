import { Module } from '@nestjs/common';
import { GradingService } from './services/grading.service';
import { GradingController } from './controllers/grading.controller';
import { SharedModule } from '../shared/shared.module';
import { QuizModule } from '../quiz/quiz.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [SharedModule, QuizModule, CourseModule],
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
