import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { CertificateService } from './services/certificate.service';
import { CertificateController } from './controllers/certificate.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [CertificateController],
  providers: [CertificateService],
  exports: [CertificateService],
})
export class CertificateModule {}
