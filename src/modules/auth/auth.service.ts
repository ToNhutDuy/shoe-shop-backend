import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import dayjs from 'dayjs';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { compareBcryptUtil, hashBcryptUtil } from '../../common/helpers/util';
import { UserStatus, AccountType, User } from '../users/entities/user.entity';
import { IUser } from '../users/interfaces/user.interface';
import {
    RegisterZodDto,
    ChangePasswordZodDto,
    CheckCodeZodDto,
    ForgotPasswordZodDto,
} from './dto/auth-zod.dto';
import { UsersResponseDto } from '../users/dto/user-response.dto';
import LoginResponse from 'src/common/interfaces/login.response';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private rolesService: RolesService,
    ) { }

    async validateUser(email: string, password: string): Promise<IUser> {
        const user = await this.usersService.findByEmail(email);
        if (!user) throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
        if (user.status === UserStatus.INACTIVE) throw new UnauthorizedException('Tài khoản chưa được kích hoạt.');
        if (user.status === UserStatus.BANNED) throw new UnauthorizedException('Tài khoản đã bị khóa.');
        if (user.accountType === AccountType.GOOGLE) throw new UnauthorizedException('Vui lòng đăng nhập bằng Google.');
        if (!user.password) throw new UnauthorizedException('Tài khoản không có mật khẩu để đăng nhập.');

        const isMatch = await compareBcryptUtil(password, user.password);
        if (!isMatch) throw new UnauthorizedException('Mật khẩu không đúng.');

        const { password: _pw, refreshToken, ...result } = user;
        return result as IUser;
    }

    async validateGoogleUser(profile: any): Promise<IUser> {
        const user = await this.usersService.createWithGoogle(profile);
        const { password, refreshToken, ...result } = user;
        return result as IUser;
    }

    private async generateTokens(payload: { username: string; sub: number }): Promise<{ accessToken: string; refreshToken: string }> {
        const accessSecret = this.configService.get('JWT_SECRET');
        const refreshSecret = this.configService.get('JWT_REFRESH_TOKEN_SECRET');
        const accessExpiresIn = this.configService.get('JWT_ACCESS_TOKEN_EXPIRED');
        const refreshExpiresIn = this.configService.get('JWT_REFRESH_TOKEN_EXPIRED');

        if (!accessSecret || !refreshSecret || !accessExpiresIn || !refreshExpiresIn) {
            this.logger.error('Thiếu cấu hình JWT.');
            throw new InternalServerErrorException('Lỗi hệ thống token.');
        }

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: accessExpiresIn }),
            this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
        ]);

        return { accessToken, refreshToken };
    }

    setRefreshTokenCookie(res: Response, token: string) {
        const maxAge = this.configService.get<number>('JWT_REFRESH_TOKEN_COOKIE_MAX_AGE');
        if (!maxAge) throw new InternalServerErrorException('Thiếu cấu hình cookie.');

        res.cookie('refreshToken', token, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
        });
    }

    setAccessTokenCookie(res: Response, token: string) {
        const maxAgeStr = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED') ?? '5m';
        const maxAge = ms(maxAgeStr as ms.StringValue);

        res.cookie('accessToken', token, {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge,
        });
    }

    setRoleIdCookie(res: Response, roleId: number) {
        res.cookie('user_role_id', roleId.toString(), {
            httpOnly: false,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
    }

    async login(user: IUser): Promise<LoginResponse> {
        const payload = { username: user.email, sub: user.id };
        const { accessToken, refreshToken } = await this.generateTokens(payload);
        const hashedRefresh = await hashBcryptUtil(refreshToken);
        await this.usersService.updateRefreshToken(user.id, hashedRefresh);

        const fullUser = await this.usersService.findOneUserById(user.id);
        if (!fullUser) throw new UnauthorizedException('Không tìm thấy người dùng.');

        const { password: _pw, ...userData } = fullUser;
        const expiresInStr = this.configService.get('JWT_ACCESS_TOKEN_EXPIRED') ?? '5m';
        const expiresAt = dayjs().add(ms(expiresInStr as ms.StringValue), 'ms').toDate();

        return {
            accessToken,
            refreshToken,
            expiresIn: expiresInStr,
            expiresAt,
            user: userData,
        };
    }

    async refreshAccessToken(
        payload: { sub: number; username: string },
        incomingRefreshToken: string,
    ): Promise<LoginResponse> {
        if (!incomingRefreshToken) throw new BadRequestException('Không có refresh token.');

        const user = await this.usersService.findOneUserById(payload.sub);
        if (!user || !user.refreshToken) throw new UnauthorizedException('Token không hợp lệ.');

        const valid = await compareBcryptUtil(incomingRefreshToken, user.refreshToken);
        if (!valid) throw new UnauthorizedException('Token không đúng.');

        const newTokens = await this.generateTokens({ username: user.email, sub: user.id });
        const hashedRefresh = await hashBcryptUtil(newTokens.refreshToken);
        await this.usersService.updateRefreshToken(user.id, hashedRefresh);

        const { password, refreshToken, ...userData } = user;
        const expiresIn = this.configService.get('JWT_ACCESS_TOKEN_EXPIRED') ?? '5m';
        const expiresAt = dayjs().add(ms(expiresIn as ms.StringValue), 'ms').toDate();

        return {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            expiresIn,
            expiresAt,
            user: userData,
        };
    }

    async logout(user: IUser, res: Response): Promise<void> {
        if (!user?.id) throw new InternalServerErrorException('Không có thông tin người dùng.');

        await this.usersService.updateRefreshToken(user.id, null);

        const cookieOptions = {
            httpOnly: true,
            secure: this.configService.get('NODE_ENV') === 'production',
            sameSite: 'lax' as const,
            path: '/',
        };

        res.clearCookie('refreshToken', cookieOptions);
        res.clearCookie('accessToken', cookieOptions);
        res.clearCookie('user_role_id');
    }

    async handleRegister(data: RegisterZodDto) {
        return this.usersService.handleRegister(data);
    }

    async handleProfile(id: number): Promise<UsersResponseDto | null> {
        const user = await this.usersService.findOneUserById(id);
        return user ? UsersResponseDto.fromEntity(user) : null;
    }

    async handleActive(data: CheckCodeZodDto) {
        return this.usersService.handleActive(data);
    }

    async retryActive(email: string) {
        return this.usersService.retryActive(email);
    }

    async forgotPassword(data: ForgotPasswordZodDto) {
        return this.usersService.forgotPassword(data);
    }

    async changePassword(data: ChangePasswordZodDto) {
        return this.usersService.changePassword(data);
    }

    async verifyRefreshTokenJwt(token: string): Promise<{ sub: number; username: string }> {
        try {
            const secret = this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET');
            return await this.jwtService.verifyAsync(token, { secret });
        } catch (error) {
            this.logger.warn('Lỗi verify refresh token: ' + error.message);
            throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ.');
        }
    }
}
