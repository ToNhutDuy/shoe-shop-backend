import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

@Injectable()
export class RefreshTokenGuard implements CanActivate {

    constructor(

        private readonly configService: ConfigService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload; refreshToken?: string }>();
        const cookies = request.cookies;
        let tokenToVerify: string | undefined;


        if (cookies && cookies.refreshToken) {
            const refreshTokenFromCookie = cookies.refreshToken;
            if (Array.isArray(refreshTokenFromCookie)) {

                tokenToVerify = refreshTokenFromCookie[0];
            } else if (typeof refreshTokenFromCookie === 'string') {
                tokenToVerify = refreshTokenFromCookie;
            } else {
                throw new UnauthorizedException('Refresh token không hợp lệ (invalid type).');
            }
        }

        if (!tokenToVerify) {
            throw new UnauthorizedException('Refresh token không được tìm thấy trong cookie.');
        }

        const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
        if (!refreshTokenSecret) {
            throw new InternalServerErrorException('Lỗi cấu hình hệ thống (missing refresh token secret).');
        }

        try {

            const payload = jwt.verify(tokenToVerify, refreshTokenSecret) as JwtPayload & { sub: number; username: string };

            request.user = payload;
            request.refreshToken = tokenToVerify;

            return true;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {

                throw new UnauthorizedException('Refresh token đã hết hạn.');
            }
            if (error instanceof jwt.JsonWebTokenError) {

                throw new UnauthorizedException('Refresh token không hợp lệ (jwt error).');
            }

            throw new UnauthorizedException('Refresh token không hợp lệ (unknown error).');
        }
    }
}