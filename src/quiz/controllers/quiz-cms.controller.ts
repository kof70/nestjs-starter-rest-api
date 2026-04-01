import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
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
import { CreateQuizDto } from '../dtos/create-quiz.dto';
import { UpdateQuizDto } from '../dtos/update-quiz.dto';
import { AddQuestionDto } from '../dtos/add-question.dto';
import { UpdateQuestionDto } from '../dtos/update-question.dto';
import {
  QuizResponseDto,
  QuestionResponseDto,
} from '../dtos/quiz-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { resolveRequestUserRole } from '../../shared/request-context/resolve-user-role';

@ApiTags('CMS - Quizzes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cms/quizzes')
export class QuizCmsController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new quiz with questions' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quiz created successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid quiz data or content item already has a quiz',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createQuiz(
    @Body() createQuizDto: CreateQuizDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuizResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = ctx.user!.role as UserRole;
    return this.quizService.createQuiz(createQuizDto, userId, userRole);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get quiz by ID' })
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
  async findById(@Param('id') id: string): Promise<QuizResponseDto> {
    return this.quizService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Update quiz settings' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quiz updated successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateQuiz(
    @Param('id') id: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuizResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.quizService.updateQuiz(id, updateQuizDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quiz' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Quiz deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quiz not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async deleteQuiz(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    await this.quizService.deleteQuiz(id, userId, userRole);
  }

  @Post(':id/questions')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Add a question to a quiz' })
  @ApiParam({ name: 'id', description: 'Quiz ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Question added successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid question data',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async addQuestion(
    @Param('id') quizId: string,
    @Body() addQuestionDto: AddQuestionDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<QuestionResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.quizService.addQuestion(quizId, addQuestionDto, userId, userRole);
  }
}
