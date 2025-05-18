
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserStatus } from 'src/modules/users/entities/user.entity';


@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'email' });

    }

    async validate(email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(email, password);
        if (!user) {
            throw new UnauthorizedException('Tài khoản hoặc mật khẩu không tồn tại');
        }
        if (user.status === UserStatus.INACTIVE) {
            throw new BadRequestException("Tài khoản chưa được kích hoạt");
        }
        return user;
    }
}
