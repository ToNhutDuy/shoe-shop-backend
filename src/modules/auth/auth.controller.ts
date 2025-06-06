import {
  Controller, Post, Body, Req, Res, HttpStatus, HttpCode, Get,
  UseGuards, UnauthorizedException, UsePipes, Query,
  InternalServerErrorException,
  BadRequestException, // Added Query
} from '@nestjs/common';
import { Request, Response } from 'express'; // Standard express types

import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard'; // Assuming this is correctly implemented
// import { AuthGuard } from '@nestjs/passport'; // AuthGuard('google') is used directly
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import LoginResponse from 'src/common/interfaces/login.response';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { IUser } from '../users/interfaces/user.interface';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import {
  changePasswordSchema, ChangePasswordZodDto,
  checkCodeSchema, CheckCodeZodDto,
  forgotPasswordSchema, ForgotPasswordZodDto, // Assuming forgotPasswordSchema only needs email
  registerSchema, RegisterZodDto,
  // loginSchema, // Not used directly in controller if LocalAuthGuard handles DTO
} from './dto/auth-zod.dto';

// --- Placeholder for RefreshTokenGuard ---
// You would need to create this guard.
// It would extract refresh token from cookie, validate its JWT structure using authService.verifyRefreshTokenJwt,
// and attach the payload to req.user.
import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common'; // For conceptual guard
import { Observable } from 'rxjs';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { User } from '../users/entities/user.entity';

@Injectable()



@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard) // LocalAuthGuard should populate req.user with IUser
  async handleLogin(
    @Req() req: Request & { user: User }, // user comes from LocalAuthGuard
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    return this.authService.login(req.user, res);
  }

  @Public() // Nếu endpoint này không yêu cầu access token ban đầu
  @UseGuards(RefreshTokenGuard) // RefreshTokenGuard sẽ xác thực JWT và gắn user, refreshToken vào req
  @Post('refresh-token')
  @ResponseMessage('Làm mới token thành công')
  async refreshToken(@Req() req, @Res() res) {
    const refreshTokenPayload = req.user; // Đã được gán trong guard
    const incomingRefreshToken = req.cookies.refreshToken;
    const result = await this.authService.refreshAccessToken(refreshTokenPayload, incomingRefreshToken, res);
    return res.json(result);
  }
  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ResponseMessage('Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt.')
  handleRegister(@Body() registerData: RegisterZodDto) {
    return this.authService.handleRegister(registerData);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard) // Protect this route
  @ResponseMessage('Lấy thông tin profile thành công!')
  async handleProfile(@Req() req: Request & { user: IUser }) { // user comes from JwtAuthGuard
    // req.user from JwtAuthGuard typically contains id, email, etc.
    return this.authService.handleProfile(req.user.id);
  }

  @Public()
  @Post('active')
  @UsePipes(new ZodValidationPipe(checkCodeSchema))
  @ResponseMessage('Kích hoạt tài khoản thành công!')
  async handleActive(@Body() checkCodeData: CheckCodeZodDto) {
    return this.authService.handleActive(checkCodeData);
  }

  @Public()
  @Post('retry-active')
  @ResponseMessage('Mã kích hoạt đã được gửi lại!')
  async retryActive(@Body('email') email: string) { // Ensure email is properly validated if coming from body
    if (!email) throw new BadRequestException('Email là bắt buộc.');
    return this.authService.retryActive(email);
  }

  @Public()
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema)) // Assuming forgotPasswordSchema validates email
  @ResponseMessage('Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn!')
  async forgotPassword(@Body() data: ForgotPasswordZodDto) {
    return this.authService.forgotPassword(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng xuất thành công') // This message will be part of the wrapper if you use a response interceptor
  async logout(
    @Req() req: Request & { user: IUser }, // user comes from JwtAuthGuard (often the full User entity or a safe subset)
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user, res);
    // With @ResponseMessage, you might not need to return a message body here
    // unless your interceptor for ResponseMessage expects it or you want to override.
    // For simplicity, returning an empty object or nothing if ResponseMessage handles it.
    return {}; // Or let ResponseMessage handle it if it's set up for that.
  }

  @Public() // Assuming this is for password reset using a token from email
  @Post('change-password')
  @UsePipes(new ZodValidationPipe(changePasswordSchema)) // changePasswordSchema should validate resetToken and newPassword
  @ResponseMessage('Mật khẩu đã được thay đổi thành công!')
  async changePassword(@Body() changePasswordAuthDto: ChangePasswordZodDto) {
    return this.authService.changePassword(changePasswordAuthDto);
  }

  // --- Google OAuth ---
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard) // Use the specific GoogleAuthGuard
  async googleAuth(@Req() req) {
    // Guard initiates the Google OAuth flow
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/redirect')
  async googleAuthRedirect(
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
  ) {
    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!clientUrl) {
      throw new InternalServerErrorException('CLIENT_URL không được cấu hình.');
    }

    if (!req.user) {
      this.logger.warn('Google login failed or no user data returned from Google strategy.');
      return res.redirect(`${clientUrl}/auth/login?error=google_login_failed`);
    }

    const loginResponse = await this.authService.login(req.user, res);

    // Nếu accessToken được set trong cookie rồi, không cần truyền qua URL nữa
    this.logger.log(`Redirecting Google authenticated user to: ${clientUrl}/auth/callback`);
    return res.redirect(`${clientUrl}/auth/callback`);
  }

  private readonly logger = new Logger(AuthController.name); // Logger for controller
}