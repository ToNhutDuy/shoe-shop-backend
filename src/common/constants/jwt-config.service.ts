// src/common/constants/jwt-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtConfigService {
    public readonly secret: string;

    constructor(private configService: ConfigService) {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');

        if (!jwtSecret) {

            throw new Error('JWT_SECRET is not defined in environment variables. Please set it in your .env file.');
        }
        this.secret = jwtSecret;
    }
}