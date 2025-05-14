import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Address } from './entities/address.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    User,
    Role,
    Address,
    EmailVerificationToken,
    PasswordResetToken,
  ]),],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule { }
