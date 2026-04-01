import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { TabService } from './services/tab.service';
import { TabController } from './controllers/tab.controller';

/**
 * Tab module for course tab management
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.11
 */
@Module({
  imports: [PrismaModule],
  controllers: [TabController],
  providers: [TabService],
  exports: [TabService],
})
export class TabModule {}
