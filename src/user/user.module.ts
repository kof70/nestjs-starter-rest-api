import { Module } from '@nestjs/common';

import { JwtAuthStrategy } from '../auth/strategies/jwt-auth.strategy';
import { SharedModule } from '../shared/shared.module';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { UserAclService } from './services/user-acl.service';

@Module({
  imports: [SharedModule],
  providers: [UserService, JwtAuthStrategy, UserAclService, UserRepository],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
