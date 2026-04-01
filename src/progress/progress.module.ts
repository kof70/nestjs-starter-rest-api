import { Module, forwardRef } from '@nestjs/common';
import { ProgressService } from './services/progress.service';
import { ProgressController } from './controllers/progress.controller';
import { SharedModule } from '../shared/shared.module';
import { CertificateModule } from '../certificate/certificate.module';

@Module({
  imports: [SharedModule, forwardRef(() => CertificateModule)],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
