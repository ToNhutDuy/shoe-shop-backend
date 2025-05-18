import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { comparePasswordUtil } from '../common/helpers/util';
import { JwtService } from '@nestjs/jwt';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from './dto/register.dto';
import { ChangePasswordAuthDto } from './dto/forgot-auth.dto';


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
            user: {
                id: user.is,
                email: user.email,
                fullName: user.fullName
            },
            access_token: this.jwtService.sign(payload),
        };
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
