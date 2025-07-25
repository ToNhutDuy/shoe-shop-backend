// src/auth/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private configService: ConfigService,
        private usersService: UsersService,
    ) {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            throw new InternalServerErrorException('JWT_SECRET is not defined in environment variables.');
        }

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        console.log('JWT Payload received in JwtStrategy:', payload);

        if (!payload || !payload.sub) {
            throw new UnauthorizedException('JWT payload không hợp lệ hoặc thiếu ID người dùng.');
        }

        const user = await this.usersService.findOneUserById(payload.sub);
        if (!user) {
            throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa.');
        }

        const userObjectToReturn = {
            id: payload.sub,
            email: payload.email,
            roles: payload.roles,
        };
        console.log('User object returned from JwtStrategy.validate:', userObjectToReturn);
        return userObjectToReturn;
    }
}