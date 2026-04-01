import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles-prisma.decorator';
import { UserRole } from '@prisma/client';
import { TabService } from '../services/tab.service';
import { CreateTabDto } from '../dtos/create-tab.dto';
import { UpdateTabDto } from '../dtos/update-tab.dto';
import { ReorderTabsDto } from '../dtos/reorder-tabs.dto';
import { TabResponseDto } from '../dtos/tab-response.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

/**
 * Tab controller for course tab management
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.11
 */
@ApiTags('tabs')
@Controller('courses/:courseId/tabs')
export class TabController {
  constructor(private readonly tabService: TabService) {}

  /**
   * Create a new tab
   * Requirements: 20.1, 20.3
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new custom tab' })
  @ApiResponse({
    status: 201,
    description: 'Tab created successfully',
    type: TabResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid tab data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async createTab(
    @Param('courseId') courseId: string,
    @Body() createTabDto: CreateTabDto,
    @Request() req: RequestWithUser,
  ): Promise<TabResponseDto> {
    return this.tabService.createTab(courseId, createTabDto, req.user.id);
  }

  /**
   * Get all tabs for a course (CMS)
   * Requirements: 20.2, 20.11
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tabs for a course (including hidden)' })
  @ApiResponse({
    status: 200,
    description: 'Tabs retrieved successfully',
    type: [TabResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseTabs(
    @Param('courseId') courseId: string,
  ): Promise<TabResponseDto[]> {
    return this.tabService.getCourseTabs(courseId);
  }

  /**
   * Get visible tabs for learners (LMS)
   * Requirements: 20.2, 20.9, 20.10
   */
  @Get('visible')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get visible tabs for learners in instructor-defined order' })
  @ApiResponse({
    status: 200,
    description: 'Visible tabs retrieved successfully',
    type: [TabResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getVisibleTabs(
    @Param('courseId') courseId: string,
  ): Promise<TabResponseDto[]> {
    return this.tabService.getVisibleTabs(courseId);
  }

  /**
   * Get tab by ID
   * Requirements: 20.1
   */
  @Get(':tabId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tab by ID' })
  @ApiResponse({
    status: 200,
    description: 'Tab retrieved successfully',
    type: TabResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tab not found' })
  async getTabById(@Param('tabId') tabId: string): Promise<TabResponseDto> {
    return this.tabService.getTabById(tabId);
  }

  /**
   * Update tab
   * Requirements: 20.1, 20.3, 20.5, 20.6, 20.7, 20.8
   */
  @Patch(':tabId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tab (title, content, URL, or visibility)' })
  @ApiResponse({
    status: 200,
    description: 'Tab updated successfully',
    type: TabResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid tab data or cannot hide last Content tab' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tab not found' })
  async updateTab(
    @Param('tabId') tabId: string,
    @Body() updateTabDto: UpdateTabDto,
    @Request() req: RequestWithUser,
  ): Promise<TabResponseDto> {
    return this.tabService.updateTab(tabId, updateTabDto, req.user.id);
  }

  /**
   * Delete tab
   * Requirements: 20.1
   */
  @Delete(':tabId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete tab' })
  @ApiResponse({ status: 204, description: 'Tab deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default or last Content tab' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Tab not found' })
  async deleteTab(
    @Param('tabId') tabId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.tabService.deleteTab(tabId, req.user.id);
  }

  /**
   * Reorder tabs
   * Requirements: 20.4
   */
  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder tabs by providing array of tab IDs' })
  @ApiResponse({
    status: 200,
    description: 'Tabs reordered successfully',
    type: [TabResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid tab IDs' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async reorderTabs(
    @Param('courseId') courseId: string,
    @Body() reorderTabsDto: ReorderTabsDto,
    @Request() req: RequestWithUser,
  ): Promise<TabResponseDto[]> {
    return this.tabService.reorderTabs(
      courseId,
      reorderTabsDto.tabIds,
      req.user.id,
    );
  }
}
