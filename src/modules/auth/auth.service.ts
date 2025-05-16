import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordUtil } from '../common/helpers/util';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) { }

    async signIn(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);

        if (!user) {
            throw new UnauthorizedException('Tài khoản không tồn tại');
        }
        const isMatch = await comparePasswordUtil(pass, user.passwordHash);

        if (!isMatch) {
            throw new UnauthorizedException('Sai mật khẩu');
        }
        const payload = { sub: user.id, username: user.email };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
}
