import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
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
import { ModuleService } from '../services/module.service';
import { CreateModuleDto } from '../dtos/create-module.dto';
import { UpdateModuleDto } from '../dtos/update-module.dto';
import { ReorderModulesDto } from '../dtos/reorder-modules.dto';
import { ModuleResponseDto } from '../dtos/module-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { ReqContext } from '../../shared/request-context/req-context.decorator';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { TeamPermissionGuard } from '../../team/guards/team-permission.guard';
import { TeamRole } from '../../team/decorators/team-role.decorator';
import { TeamActionLogInterceptor } from '../../team/interceptors/team-action-log.interceptor';
import { resolveRequestUserRole } from '../../shared/request-context/resolve-user-role';

@ApiTags('CMS - Modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TeamPermissionGuard)
@UseInterceptors(TeamActionLogInterceptor)
@Controller('cms/courses/:courseId/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Add a module to a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Module created successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async create(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: CreateModuleDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ModuleResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.moduleService.create(courseId, createModuleDto, userId, userRole);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('VIEWER')
  @ApiOperation({ summary: 'List all modules in a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules retrieved successfully',
    type: [ModuleResponseDto],
  })
  async findByCourse(
    @Param('courseId') courseId: string,
  ): Promise<ModuleResponseDto[]> {
    return this.moduleService.findByCourse(courseId);
  }

  @Post('reorder')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Reorder modules within a course' })
  @ApiParam({ name: 'courseId', description: 'Course ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Modules reordered successfully',
    type: [ModuleResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid module IDs or incomplete list',
  })
  async reorder(
    @Param('courseId') courseId: string,
    @Body() reorderDto: ReorderModulesDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ModuleResponseDto[]> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.moduleService.reorderModules(
      courseId,
      reorderDto.moduleIds,
      userId,
      userRole,
    );
  }

}

@ApiTags('CMS - Modules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TeamPermissionGuard)
@UseInterceptors(TeamActionLogInterceptor)
@Controller('cms/modules')
export class ModuleManagementController {
  constructor(private readonly moduleService: ModuleService) {}

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('VIEWER')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module retrieved successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  async findById(@Param('id') id: string): Promise<ModuleResponseDto> {
    return this.moduleService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Module updated successfully',
    type: ModuleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async update(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<ModuleResponseDto> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    return this.moduleService.update(id, updateModuleDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @TeamRole('EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', description: 'Module ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Module deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Module not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Module is a prerequisite for other modules',
  })
  async delete(
    @Param('id') id: string,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    const userId = String(ctx.user!.id);
    const userRole = resolveRequestUserRole(ctx.user!);
    await this.moduleService.delete(id, userId, userRole);
  }
}
