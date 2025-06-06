import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { UserHelper } from './helpers/user.helper';
import { HttpModule } from '@nestjs/axios';
import { EmailVerificationCode } from './entities/email-verification-code.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { Roles } from '../roles/entities/role.entity';
import { MediaModule } from '../media/media.module';



@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => RolesModule),
    forwardRef(() => MediaModule), TypeOrmModule.forFeature([
      User,
      Address,
      EmailVerificationCode,
      PasswordResetCode,
      Roles

    ]), HttpModule,],
  controllers: [UsersController],
  providers: [UsersService, UserHelper],
  exports: [UsersService, UserHelper]
})
export class UsersModule { }
