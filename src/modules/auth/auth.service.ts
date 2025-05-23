import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordUtil } from '../../common/helpers/util';
import { JwtService } from '@nestjs/jwt';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from './dto/register.dto';
import { ChangePasswordAuthDto } from './dto/forgot-auth.dto';
import { ConfigService } from '@nestjs/config';
import { UserStatus, AccountType } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }


    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
        }

        if (user.status === UserStatus.INACTIVE) {
            throw new UnauthorizedException('Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản.');
        }

        if (user.status === UserStatus.BANNED) {
            throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }

        if (user.accountType === AccountType.GOOGLE) {
            throw new UnauthorizedException('Tài khoản này được đăng ký bằng Google. Vui lòng đăng nhập bằng tài khoản Google của bạn.');
        }
        if (user.password === null) {

            throw new UnauthorizedException('Tài khoản không có mật khẩu để xác thực cục bộ. Vui lòng kiểm tra phương thức đăng nhập.');
        }

        let isMatch = false;
        try {
            isMatch = await comparePasswordUtil(pass, user.password);
        } catch (error) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');
        }

        if (!isMatch) {
            throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ.');

        }
        const { password, ...result } = user;
        return result;
    }


    async validateGoogleUser(profile: any) {
        return this.usersService.createWithGoogle(profile);
    }

    async login(user: any) {

        const payload = {
            username: user.email,
            sub: user.id,

        };


        const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRED') || '7d';

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,

            },
            access_token: this.jwtService.sign(payload),
            refresh_token: this.jwtService.sign(payload, {
                expiresIn: refreshTokenExpiresIn,
            }),
        };
    }
    async refreshAccessToken(refreshToken: string): Promise<{ access_token: string }> {
        try {
            // 1. Xác minh refresh token
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
            });

            // 2. Kiểm tra xem user có tồn tại không 
            const user = await this.usersService.findOneByEmail(payload.sub);
            if (!user) {
                throw new UnauthorizedException('Refresh token không hợp lệ hoặc người dùng không tồn tại.');
            }

            // 3. Tạo access token mới
            const newAccessTokenPayload = {
                username: user.email,
                sub: user.id,
                //role: user.role.name, 
            };
            const newAccessToken = this.jwtService.sign(newAccessTokenPayload);

            return { access_token: newAccessToken };

        } catch (error) {
            // Nếu refresh token không hợp lệ hoặc hết hạn
            throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn.');
        }
    }
    async handleRegister(registerAuthDto: RegisterAuthDto) {
        return await this.usersService.handleRegister(registerAuthDto);
    }

    async handleActive(checkCodeTokenAuthDto: CheckCodeTokenAuthDto) {
        return await this.usersService.handleActive(checkCodeTokenAuthDto);
    }

    async retryActive(email: string) {
        return await this.usersService.retryActive(email);
    }

    async forgotPassword(email: string) {
        return await this.usersService.forgotPassword(email);
    }

    async changePassword(changePasswordAuthDto: ChangePasswordAuthDto) {
        return await this.usersService.changePassword(changePasswordAuthDto);
    }

}