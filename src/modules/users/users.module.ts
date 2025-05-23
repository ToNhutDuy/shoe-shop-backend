import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Roles } from '../roles/entities/role.entity';
import { UserHelper } from './helpers/user.helper';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [TypeOrmModule.forFeature([
    User,
    Roles,
    Address,
    EmailVerificationToken,
    PasswordResetToken,

  ]), HttpModule],
  controllers: [UsersController],
  providers: [UsersService, UserHelper],
  exports: [UsersService, UserHelper]
})
export class UsersModule { }
