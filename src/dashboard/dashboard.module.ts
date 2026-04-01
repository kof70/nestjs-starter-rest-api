import { Module } from '@nestjs/common';
import { InstructorDashboardService } from './services/instructor-dashboard.service';
import { InstructorDashboardController } from './controllers/instructor-dashboard.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [InstructorDashboardController, AdminDashboardController],
  providers: [InstructorDashboardService, AdminDashboardService],
  exports: [InstructorDashboardService, AdminDashboardService],
})
export class DashboardModule {}
