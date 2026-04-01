import { Module } from '@nestjs/common';
import { CourseService } from './services/course.service';
import { ModuleService } from './services/module.service';
import { ContentItemService } from './services/content-item.service';
import { LmsNavigationService } from './services/lms-navigation.service';
import { CourseController } from './controllers/course.controller';
import { CourseLmsController } from './controllers/course-lms.controller';
import { LmsNavigationController } from './controllers/lms-navigation.controller';
import {
  ModuleController,
  ModuleManagementController,
} from './controllers/module.controller';
import {
  ContentItemController,
  ContentItemManagementController,
} from './controllers/content-item.controller';
import { SharedModule } from '../shared/shared.module';
import { ProgressModule } from '../progress/progress.module';
import { NotificationModule } from '../notification/notification.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [SharedModule, ProgressModule, NotificationModule, TeamModule],
  controllers: [
    CourseController,
    CourseLmsController,
    LmsNavigationController,
    ModuleController,
    ModuleManagementController,
    ContentItemController,
    ContentItemManagementController,
  ],
  providers: [
    CourseService,
    ModuleService,
    ContentItemService,
    LmsNavigationService,
  ],
  exports: [
    CourseService,
    ModuleService,
    ContentItemService,
    LmsNavigationService,
  ],
})
export class CourseModule {}
