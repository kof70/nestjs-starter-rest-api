import {
  Controller,
  Post,
  Get,
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
import { ContentItemService } from '../services/content-item.service';
import { CreateContentItemDto } from '../dtos/create-content-item.dto';
import { UpdateContentItemDto } from '../dtos/update-content-item.dto';
import { ReorderContentItemsDto } from '../dtos/reorder-content-items.dto';
import { ContentItemResponseDto } from '../dtos/content-item-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { TeamPermissionGuard } from '../../team/guards/team-permission.guard';
import { TeamRole } from '../../team/decorators/team-role.decorator';
import { TeamActionLogInterceptor } from '../../team/interceptors/team-action-log.interceptor';

@ApiTags('Content Items (CMS)')
@ApiBearerAuth()
@Controller('cms/modules/:moduleId/content')
@UseGuards(JwtAuthGuard, RolesGuard, TeamPermissionGuard)
@UseInterceptors(TeamActionLogInterceptor)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class ContentItemController {
  constructor(private readonly contentItemService: ContentItemService) {}

  @Post()
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Add content item to module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: 201,
    description: 'Content item created successfully',
    type: ContentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async create(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateContentItemDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ContentItemResponseDto> {
    return this.contentItemService.create(moduleId, dto, userId, userRole);
  }

  @Get()
  @TeamRole('VIEWER')
  @ApiOperation({ summary: 'Get all content items in a module' })
  @ApiParam({ name: 'moduleId', description: 'Module ID' })
  @ApiResponse({
    status: 200,
    description: 'Content items retrieved successfully',
    type: [ContentItemResponseDto],
  })
  async findByModule(
    @Param('moduleId') moduleId: string,
  ): Promise<ContentItemResponseDto[]> {
    return this.contentItemService.findByModule(moduleId);
  }
}

@ApiTags('Content Items (CMS)')
@ApiBearerAuth()
@Controller('cms/content')
@UseGuards(JwtAuthGuard, RolesGuard, TeamPermissionGuard)
@UseInterceptors(TeamActionLogInterceptor)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class ContentItemManagementController {
  constructor(private readonly contentItemService: ContentItemService) {}

  @Get(':id')
  @TeamRole('VIEWER')
  @ApiOperation({ summary: 'Get content item by ID' })
  @ApiParam({ name: 'id', description: 'Content item ID' })
  @ApiResponse({
    status: 200,
    description: 'Content item retrieved successfully',
    type: ContentItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Content item not found' })
  async findById(@Param('id') id: string): Promise<ContentItemResponseDto> {
    return this.contentItemService.findById(id);
  }

  @Patch(':id')
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Update content item' })
  @ApiParam({ name: 'id', description: 'Content item ID' })
  @ApiResponse({
    status: 200,
    description: 'Content item updated successfully',
    type: ContentItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Content item not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContentItemDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ContentItemResponseDto> {
    return this.contentItemService.update(id, dto, userId, userRole);
  }

  @Delete(':id')
  @TeamRole('EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete content item' })
  @ApiParam({ name: 'id', description: 'Content item ID' })
  @ApiResponse({ status: 204, description: 'Content item deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Content item not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<void> {
    await this.contentItemService.delete(id, userId, userRole);
  }

  @Post('reorder')
  @TeamRole('EDITOR')
  @ApiOperation({ summary: 'Reorder content items within a module' })
  @ApiResponse({
    status: 200,
    description: 'Content items reordered successfully',
    type: [ContentItemResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async reorder(
    @Body() dto: ReorderContentItemsDto & { moduleId: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ): Promise<ContentItemResponseDto[]> {
    return this.contentItemService.reorderContentItems(
      dto.moduleId,
      dto.contentItemIds,
      userId,
      userRole,
    );
  }
}
