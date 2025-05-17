import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordUtil } from '../common/helpers/util';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService, private jwtService: JwtService) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);

        if (!user) return null;
        const isMatch = await comparePasswordUtil(pass, user.password);

        if (!isMatch) return null;
        return user;

    }

    async login(user: any) {
        const payload = { username: user.email, sub: user.id };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }

    async handleRegister(registerDto: RegisterDto) {
        return await this.usersService.handleRegister(registerDto);
    }
}
