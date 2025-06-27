import {
  Controller, Post, Body, Req, Res, HttpStatus, HttpCode, Get,
  UseGuards, UnauthorizedException, UsePipes, Query,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import LoginResponse from 'src/common/interfaces/login.response';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { IUser } from '../users/interfaces/user.interface';
import { ZodValidationPipe } from '../../common/pipe/zod-validation.pipe';
import {
  changePasswordSchema, ChangePasswordZodDto,
  checkCodeSchema, CheckCodeZodDto,
  forgotPasswordSchema, ForgotPasswordZodDto,
  registerSchema, RegisterZodDto,
} from './dto/auth-zod.dto';
import { Logger } from '@nestjs/common';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { User } from '../users/entities/user.entity';

interface IUserWithRole extends IUser {
  role_id: number;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @ResponseMessage('Đăng nhập thành công')
  async handleLogin(
    @Req() req: Request & { user: User },
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginResponse, 'refreshToken'>> {
    const loginResult = await this.authService.login(req.user);
    this.authService.setRefreshTokenCookie(res, loginResult.refreshToken);
    this.authService.setRoleIdCookie(res, (loginResult.user as IUserWithRole).role_id);

    const { refreshToken, ...responseBody } = loginResult;
    return responseBody;
  }


  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh-token')
  @ResponseMessage('Làm mới token thành công')
  async refreshToken(
    @Req() req: Request & { user: { sub: number; username: string }; cookies: { refreshToken: string } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<LoginResponse, 'refreshToken'>> {
    const refreshTokenPayload = req.user;
    const incomingRefreshToken = req.cookies.refreshToken;

    const refreshResult = await this.authService.refreshAccessToken(refreshTokenPayload, incomingRefreshToken);

    this.authService.setRefreshTokenCookie(res, refreshResult.refreshToken);
    this.authService.setRoleIdCookie(res, (refreshResult.user as IUserWithRole).role_id);

    const { refreshToken, ...responseBody } = refreshResult;
    return responseBody;
  }

  @Public()
  @Post('register')
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ResponseMessage('Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt.')
  handleRegister(@Body() registerData: RegisterZodDto) {
    return this.authService.handleRegister(registerData);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Lấy thông tin profile thành công!')
  async handleProfile(@Req() req: Request & { user: IUser }) {
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
  async retryActive(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email là bắt buộc.');
    return this.authService.retryActive(email);
  }

  @Public()
  @Post('forgot-password')
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  @ResponseMessage('Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn!')
  async forgotPassword(@Body() data: ForgotPasswordZodDto) {
    return this.authService.forgotPassword(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng xuất thành công')
  async logout(
    @Req() req: Request & { user: IUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.user, res);
    return {};
  }

  @Public()
  @Post('change-password')
  @UsePipes(new ZodValidationPipe(changePasswordSchema))
  @ResponseMessage('Mật khẩu đã được thay đổi thành công!')
  async changePassword(@Body() changePasswordAuthDto: ChangePasswordZodDto) {
    return this.authService.changePassword(changePasswordAuthDto);
  }

  // --- Google OAuth ---
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {

  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/redirect')
  async googleAuthRedirect(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!clientUrl) {
      throw new InternalServerErrorException('CLIENT_URL không được cấu hình.');
    }

    if (!req.user) {
      this.logger.warn('Google login failed or no user data returned from Google strategy.');
      return res.redirect(`${clientUrl}/login?error=google_login_failed`);
    }

    const loginResult = await this.authService.login(req.user as User);

    this.authService.setRefreshTokenCookie(res, loginResult.refreshToken);
    this.authService.setRoleIdCookie(res, (loginResult.user as IUserWithRole).role_id);

    const redirectUrl = `${clientUrl}/google/redirect?accessToken=${loginResult.accessToken}`;
    this.logger.log(`Redirecting Google authenticated user to: ${redirectUrl}`);
    return res.redirect(redirectUrl);
  }
}
