import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {

  }
  @Post('login')
  login(@Body() loginAuthDto: LoginAuthDto) {
    return this.authService.signIn(loginAuthDto.email, loginAuthDto.passwordHash);
  }
}
