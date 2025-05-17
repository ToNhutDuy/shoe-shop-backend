import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public } from 'src/decorator/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly mailerService: MailerService
  ) {

  }
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  handelLogin(@Request() req) {
    return this.authService.login(req.user);
  }


  @Post('register')
  @Public()
  register(@Body() registerDto: RegisterDto) {
    return this.authService.handleRegister(registerDto);
  }

  @Get('mail')
  @Public()
  testEmail() {
    this.mailerService
      .sendMail({
        to: 'shoeshoptest123@gmail.com', // list of receivers
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: 'welcome', // plaintext body
        html: '<b>Shoe shop hello world</b>', // HTML body content
      })

    return "email ok";
  }
}
