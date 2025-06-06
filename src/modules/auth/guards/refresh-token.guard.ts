import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
    Logger, // Thêm Logger để ghi log
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken'; // Sử dụng import đầy đủ hơn
import { JwtPayload } from 'jsonwebtoken'; // Import kiểu JwtPayload

@Injectable()
export class RefreshTokenGuard implements CanActivate {
    private readonly logger = new Logger(RefreshTokenGuard.name); // Khởi tạo logger

    constructor(
        // Sửa lỗi cú pháp constructor và inject ConfigService đúng cách
        private readonly configService: ConfigService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload; refreshToken?: string }>(); // Thêm kiểu cho user và refreshToken vào Request
        const cookies = request.cookies;
        let tokenToVerify: string | undefined;

        this.logger.debug('RefreshTokenGuard activated.');

        if (cookies && cookies.refreshToken) {
            const refreshTokenFromCookie = cookies.refreshToken;
            if (Array.isArray(refreshTokenFromCookie)) {
                // Nếu client gửi nhiều refreshToken cookies trùng tên, nó sẽ là một mảng
                this.logger.warn('Multiple refreshTokens found in cookies. Using the first one.');
                tokenToVerify = refreshTokenFromCookie[0]; // Chọn token đầu tiên (hoặc cuối cùng: refreshTokenFromCookie[refreshTokenFromCookie.length - 1])
            } else if (typeof refreshTokenFromCookie === 'string') {
                tokenToVerify = refreshTokenFromCookie;
            } else {
                this.logger.warn(`Unexpected type for refreshToken in cookie: ${typeof refreshTokenFromCookie}`);
                throw new UnauthorizedException('Refresh token không hợp lệ (invalid type).');
            }
        }

        if (!tokenToVerify) {
            this.logger.warn('Refresh token not found in cookies.');
            throw new UnauthorizedException('Refresh token không được tìm thấy trong cookie.');
        }

        const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
        if (!refreshTokenSecret) {
            this.logger.error('JWT_REFRESH_TOKEN_SECRET is not configured in ConfigService.');
            // Đây là lỗi cấu hình server, không nên trả về UnauthorizedException mà là InternalServerErrorException
            throw new InternalServerErrorException('Lỗi cấu hình hệ thống (missing refresh token secret).');
        }

        try {
            // Xác thực token và lấy payload
            const payload = jwt.verify(tokenToVerify, refreshTokenSecret) as JwtPayload & { sub: number; username: string }; // Ép kiểu payload nếu bạn biết rõ cấu trúc

            // Gán payload và chuỗi refresh token vào request để controller có thể dùng
            request.user = payload; // Gắn payload (chứa sub, username, iat, exp)
            request.refreshToken = tokenToVerify; // Gắn chính chuỗi refresh token đã được xác thực

            this.logger.log(`Refresh token validated successfully for user: ${payload.username} (ID: ${payload.sub})`);
            return true;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                this.logger.warn(`Refresh token expired: ${error.message}`);
                throw new UnauthorizedException('Refresh token đã hết hạn.');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                this.logger.warn(`Invalid refresh token (JsonWebTokenError): ${error.message}`);
                throw new UnauthorizedException('Refresh token không hợp lệ (jwt error).');
            }
            this.logger.error(`Unexpected error verifying refresh token: ${error.message}`, error.stack);
            throw new UnauthorizedException('Refresh token không hợp lệ (unknown error).');
        }
    }
}