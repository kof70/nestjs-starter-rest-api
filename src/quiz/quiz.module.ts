import { Module } from '@nestjs/common';
import { QuizService } from './services/quiz.service';
import { QuizCmsController } from './controllers/quiz-cms.controller';
import { QuestionCmsController } from './controllers/question-cms.controller';
import { QuizLmsController } from './controllers/quiz-lms.controller';
import { SharedModule } from '../shared/shared.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [SharedModule, TeamModule],
  controllers: [
    QuizCmsController,
    QuestionCmsController,
    QuizLmsController,
  ],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
