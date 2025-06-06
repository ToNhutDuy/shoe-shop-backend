import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { compareBcryptUtil, hashBcryptUtil } from '../../common/helpers/util';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus, AccountType, User } from '../users/entities/user.entity'; // Added User for type hints
import { Response } from 'express';
import LoginResponse from 'src/common/interfaces/login.response';
import { IUser } from '../users/interfaces/user.interface';
import { RegisterZodDto, ChangePasswordZodDto, CheckCodeZodDto, ForgotPasswordZodDto } from './dto/auth-zod.dto'; // For DTO types
import { UsersResponseDto } from '../users/dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import ms from 'ms';
import dayjs from 'dayjs';
import { RolesService } from '../roles/roles.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private rolesService: RolesService,
    ) { }

    async validateUser(email: string, pass: string): Promise<IUser> {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new UnauthorizedException(
                'Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản.',
            );
        }

        if (user.status === UserStatus.BANNED) {
            throw new UnauthorizedException(
                'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
            );
        }

        if (user.accountType === AccountType.GOOGLE) {
            throw new UnauthorizedException(
                'Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng tài khoản Google của bạn.',
            );
        }

        if (user.password === null) {
            throw new UnauthorizedException(
                'Tài khoản không có mật khẩu để xác thực cục bộ. Vui lòng kiểm tra phương thức đăng nhập.',
            );
        }
        if (!user.password) {
            throw new UnauthorizedException(
                'Tài khoản không có mật khẩu để xác thực cục bộ. Vui lòng kiểm tra phương thức đăng nhập.'
            );
        }

        let isMatch = false;
        try {
            isMatch = await compareBcryptUtil(pass, user.password);
        } catch (error) {
            this.logger.error(
                `Error comparing password for user ${email}: ${error.message}`,
                error.stack,
            );
            // Do not throw internal server error here, still invalid credentials
            throw new UnauthorizedException('Mâtj Thông tin đăng nhập không hợp lệ.');
        }

        if (!isMatch) {
            throw new UnauthorizedException('Mat Thông tin đăng nhập không hợp lệ.');
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, ...result } = user;
        return result as IUser;
    }

    async validateGoogleUser(profile: any): Promise<IUser> {
        const user = await this.usersService.createWithGoogle(profile);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, ...result } = user;
        return result as IUser;
    }

    private async generateTokens(payload: { username: string; sub: number }): Promise<{ accessToken: string; refreshToken: string }> {
        const accessTokenSecret = this.configService.get<string>('JWT_SECRET');
        const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED');
        const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
        const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRED');

        if (!accessTokenSecret || !accessTokenExpiresIn || !refreshTokenSecret || !refreshTokenExpiresIn) {
            this.logger.error('Missing JWT configuration for token generation.');
            throw new InternalServerErrorException('Lỗi cấu hình hệ thống, không thể tạo token.');
        }

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: accessTokenSecret,
                expiresIn: accessTokenExpiresIn,
            }),
            this.jwtService.signAsync(payload, {
                secret: refreshTokenSecret,
                expiresIn: refreshTokenExpiresIn,
            }),
        ]);

        return { accessToken, refreshToken };
    }

    private setRefreshTokenCookie(res: Response, token: string): void {
        const refreshTokenCookieMaxAge = this.configService.get<number>('JWT_REFRESH_TOKEN_COOKIE_MAX_AGE');
        if (refreshTokenCookieMaxAge === undefined) { // Check for undefined specifically
            this.logger.error('Missing JWT_REFRESH_TOKEN_COOKIE_MAX_AGE configuration.');
            throw new InternalServerErrorException('Lỗi cấu hình cookie.');
        }

        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: this.configService.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax', // Or 'strict' if applicable
            path: '/',
            maxAge: refreshTokenCookieMaxAge,
        });
    }

    async login(user: User, res: Response): Promise<LoginResponse> {
        const payload = { username: user.email, sub: user.id };
        this.logger.debug(`Generating tokens for user: ${user.email}, ID: ${user.id}`);

        const tokens = await this.generateTokens(payload);
        this.setRefreshTokenCookie(res, tokens.refreshToken);

        const hashedRefreshToken = await hashBcryptUtil(tokens.refreshToken);
        await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);


        const { refreshToken: storedRefreshToken, ...userData } = user;
        const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') ?? '5m';

        // Ép kiểu cho TS để nhận là ms.StringValue
        const expiresInMs = ms(accessTokenExpiresIn as ms.StringValue);

        if (typeof expiresInMs !== 'number') {
            throw new Error('Invalid JWT_ACCESS_TOKEN_EXPIRED format');
        }

        const expiresAt = dayjs().add(expiresInMs, 'ms').toDate();

        return {
            accessToken: tokens.accessToken,
            expiresIn: accessTokenExpiresIn, // "5m"
            expiresAt,                        // ISO string ví dụ: "2025-06-03T15:00:00.000Z"
            user: userData,
        };
    }

    async refreshAccessToken(
        // This payload comes from a validated (by a Guard) refresh token JWT
        refreshTokenPayload: { sub: number; username: string },
        incomingRefreshToken: string, // The actual refresh token string from cookie/header
        res: Response,
    ): Promise<LoginResponse> {
        this.logger.debug(`AuthService: Attempting to refresh token for user ID: ${refreshTokenPayload.sub}`);
        this.logger.debug(`AuthService: Incoming refresh token string: ${incomingRefreshToken}`); // Log token nhận được

        // **Kiểm tra an toàn bổ sung**
        if (typeof incomingRefreshToken !== 'string' || !incomingRefreshToken) {
            this.logger.error(`CRITICAL: incomingRefreshToken is not a valid string! Value: ${incomingRefreshToken}`);
            // Có thể ném lỗi ở đây để ngăn chặn việc gọi compareBcryptUtil với dữ liệu sai
            throw new BadRequestException('Dữ liệu refresh token không hợp lệ.');
        }

        const user = await this.usersService.findById(refreshTokenPayload.sub);


        if (!user || !user.refreshToken) {
            this.logger.warn(`Refresh attempt for user ID ${refreshTokenPayload.sub} failed: User or stored token not found.`);
            throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi (user/token-db).');
        }

        const isRefreshTokenMatching = await compareBcryptUtil(incomingRefreshToken, user.refreshToken);
        if (!isRefreshTokenMatching) {
            this.logger.warn(`Refresh attempt for user ID ${refreshTokenPayload.sub} failed: Token mismatch.`);
            throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi (mismatch).');
        }

        // User and token are valid, issue new tokens
        // The payload for new tokens should still be based on the confirmed user identity
        const newPayload = { username: user.email, sub: user.id };
        const newTokens = await this.generateTokens(newPayload);
        this.setRefreshTokenCookie(res, newTokens.refreshToken);

        const newHashedRefreshToken = await hashBcryptUtil(newTokens.refreshToken);
        await this.usersService.updateRefreshToken(user.id, newHashedRefreshToken);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, refreshToken, ...userData } = user;
        const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') || '5m';

        const expiresInMs = ms(accessTokenExpiresIn as ms.StringValue);

        const expiresAt = dayjs().add(expiresInMs, 'ms').toDate();
        return {
            expiresIn: accessTokenExpiresIn,
            expiresAt,
            accessToken: newTokens.accessToken,
            user: userData,
        };
    }

    async logout(user: IUser, res: Response): Promise<void> { // Changed to User as it might come from JwtAuthGuard
        if (!user || !user.id) {
            // This case should ideally not happen if JwtAuthGuard is effective
            this.logger.warn('Logout attempt with invalid user data.');
            throw new InternalServerErrorException('Thông tin người dùng không hợp lệ để đăng xuất.');
        }

        this.logger.log(`Logging out user ID: ${user.id}`);
        await this.usersService.updateRefreshToken(user.id, null);

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: this.configService.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
        });

        // Clearing accessToken cookie: Only if your client stores access tokens in cookies.
        // Typically, access tokens are stored in client-side memory (e.g., JS variable)
        // and sent via Authorization header. If so, this line might not be necessary
        // or could be handled client-side.
        res.clearCookie('accessToken', {
            httpOnly: true, // If it was set as httpOnly
            secure: this.configService.get<string>('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
        });
    }

    async handleRegister(registerData: RegisterZodDto) {
        return this.usersService.handleRegister(registerData);
    }

    async handleProfile(id: number): Promise<UsersResponseDto | null> {
        const user = await this.usersService.findOne(id);

        if (!user) return null;

        const userDto = plainToInstance(UsersResponseDto, {
            ...user,
            role: user.role_id || null, // tuỳ bạn muốn gì
        });

        return userDto;
    }

    async handleActive(checkCodeData: CheckCodeZodDto) {
        return this.usersService.handleActive(checkCodeData);
    }

    async retryActive(email: string) {
        return this.usersService.retryActive(email);
    }

    async forgotPassword(data: ForgotPasswordZodDto) {
        return this.usersService.forgotPassword(data);
    }

    // Assuming ChangePasswordZodDto contains a resetToken and newPassword for this public endpoint
    async changePassword(changePasswordData: ChangePasswordZodDto) {
        return this.usersService.changePassword(changePasswordData);
    }

    // Helper to verify refresh token JWT structure (can be used by a RefreshTokenGuard)
    // This does NOT check against the database, only the token's own validity.
    async verifyRefreshTokenJwt(token: string): Promise<{ sub: number; username: string }> {
        try {
            const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
            if (!refreshTokenSecret) {
                throw new InternalServerErrorException('Missing JWT_REFRESH_TOKEN_SECRET configuration.');
            }
            const payload = await this.jwtService.verifyAsync(token, { secret: refreshTokenSecret });
            return payload as { sub: number; username: string };
        } catch (error) {
            this.logger.warn(`Invalid refresh token JWT: ${error.message}`);
            if (error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Refresh token đã hết hạn, vui lòng đăng nhập lại.');
            }
            throw new UnauthorizedException('Refresh token không hợp lệ (jwt structure).');
        }
    }
}