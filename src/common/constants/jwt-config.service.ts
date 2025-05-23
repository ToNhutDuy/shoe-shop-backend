// src/common/constants/jwt-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtConfigService {
    public readonly secret: string; // Khai báo là string

    constructor(private configService: ConfigService) {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {
            // Ném lỗi ngay lập tức nếu biến môi trường không tồn tại
            throw new Error('JWT_SECRET is not defined in environment variables. Please set it in your .env file.');
        }
        this.secret = jwtSecret; // Gán giá trị sau khi đã kiểm tra non-null
    }
}