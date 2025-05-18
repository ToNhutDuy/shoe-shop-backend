import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LocalAuthGuard } from './passport/local-auth.guard';
import { JwtAuthGuard } from './passport/jwt-auth.guard';
import { Public, ResponseMessage } from 'src/decorator/public.decorator';

import { MailerService } from '@nestjs-modules/mailer';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from './dto/register.dto';
import { RetryActivationDto } from './dto/update-auth.dto';
import { ChangePasswordAuthDto, ForgotAuthDto } from './dto/forgot-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly mailerService: MailerService
  ) {

  }
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  @ResponseMessage('Fetch login')
  handelLogin(@Request() req) {
    return this.authService.login(req.user);
  }


  @Post('register')
  @Public()
  register(@Body() registerDto: RegisterAuthDto) {
    return this.authService.handleRegister(registerDto);
  }
  @Post('check-code')
  @Public()
  checkCodeToken(@Body() checkCodeTokenAuthDto: CheckCodeTokenAuthDto) {
    return this.authService.handleActive(checkCodeTokenAuthDto);
  }
  @Post('retry-activation')
  @Public()
  retryActive(@Body() dto: RetryActivationDto) {
    return this.authService.retryActive(dto.email);
  }
  @Post('forgot-password')
  @Public()
  forgotPassword(@Body() dto: ForgotAuthDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('change-password')
  @Public()
  changePassword(@Body() changePasswordAuthDto: ChangePasswordAuthDto) {
    return this.authService.changePassword(changePasswordAuthDto);
  }
  @Get('mail')
  @Public()
  testEmail() {
    this.mailerService
      .sendMail({
        to: 'shoeshoptest123@gmail.com', // list of receivers
        subject: 'Testing Nest MailerModule ✔', // Subject line
        text: 'welcome', // plaintext body
        template: 'register',
        context: {
          name: 'Shoe-shop',
          activationCode: 123456789
        }
      })

    return "email ok";
  }
}
