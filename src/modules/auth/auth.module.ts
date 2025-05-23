import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [ConfigModule, UsersModule, JwtModule.registerAsync({
    useFactory: async (configService: ConfigService) => ({
      global: true,
      secret: configService.get<string>('JWT_SECRET'),
      signOptions: {
        expiresIn: configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') || '1h',
      },
    }),
    inject: [ConfigService],
  }), PassportModule],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard, GoogleStrategy],
})
export class AuthModule { }
