import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { QuizService } from '../services/quiz.service';
import { SubmitQuizDto } from '../dtos/submit-quiz.dto';
import {
  QuizResponseDto,
  QuizAttemptResponseDto,
  QuizSubmissionResultDto,
  QuestionResponseDto,
} from '../dtos/quiz-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';

@ApiTags('LMS - Quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lms/quizzes')
export class QuizLmsController {
  constructor(private readonly quizService: QuizService) {}

  @Get(':id')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get quiz details (without correct answers)' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz retrieved successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  async findById(@Param('id') id: string): Promise<any> {
    const quiz = await this.quizService.findById(id);
    
    // Remove isCorrect from options for learners
    return {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options.map((opt) => {
          const { isCorrect, ...optionWithoutAnswer } = opt;
          return optionWithoutAnswer;
        }),
      })),
    };
  }

  @Post(':id/submit')
  @Roles(UserRole.LEARNER)
  @ApiOperation({ summary: 'Submit quiz answers and get immediate grading' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quiz submitted and graded successfully',
    type: QuizSubmissionResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Maximum attempts reached or invalid answers',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  async submitQuiz(
    @Param('id') quizId: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuizSubmissionResultDto> {
    const userId = String(ctx.user!.id);
    const result = await this.quizService.submitQuiz(quizId, submitQuizDto, userId);
    
    // Get correct answers to return with submission result
    const correctAnswers = await this.quizService.getCorrectAnswers(quizId, userId);
    
    return {
      ...result,
      correctAnswers,
    };
  }

  @Get(':id/attempts')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all quiz attempts for the current user' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz attempts retrieved successfully',
    type: [QuizAttemptResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  async getAttempts(
    @Param('id') quizId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuizAttemptResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.quizService.getAttempts(quizId, userId);
  }

  @Get(':id/answers')
  @Roles(UserRole.LEARNER, UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get correct answers (only after quiz completion)' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Correct answers retrieved successfully',
    type: [QuestionResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must complete quiz before viewing answers',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  async getCorrectAnswers(
    @Param('id') quizId: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuestionResponseDto[]> {
    const userId = String(ctx.user!.id);
    return this.quizService.getCorrectAnswers(quizId, userId);
  }
}
