import {
  Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus, UseInterceptors, Req, Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public, ResponseMessage } from 'src/common/decorators/public.decorator';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from './dto/register.dto';
import { RetryActivationDto } from './dto/update-auth.dto';
import { ChangePasswordAuthDto, ForgotAuthDto } from './dto/forgot-auth.dto';
import { User } from 'src/common/decorators/user.decorator';
import { IUser } from '../users/interfaces/user.interface';
import { AuthGuard } from '@nestjs/passport';
import { UnauthorizedException } from '@nestjs/common';
import { TransformInterceptor } from 'src/core/interceptors/transform.interceptor';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@UseInterceptors(TransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng nhập thành công')
  async handleLogin(@Req() req) {

    return this.authService.login(req.user);
  }

  @Public()
  @Post('register')
  @ResponseMessage('Đăng ký tài khoản thành công. Vui lòng kiểm tra email để kích hoạt.')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterAuthDto) {
    return await this.authService.handleRegister(registerDto);
  }

  @Public()
  @Post('check-code')
  @ResponseMessage('Tài khoản của bạn đã được kích hoạt thành công!')
  @HttpCode(HttpStatus.OK)
  async checkCodeToken(@Body() checkCodeTokenAuthDto: CheckCodeTokenAuthDto) {
    return await this.authService.handleActive(checkCodeTokenAuthDto);
  }

  @Public()
  @Post('retry-activation')
  @ResponseMessage('Mã kích hoạt mới đã được gửi đến email của bạn.')
  @HttpCode(HttpStatus.OK)
  async retryActive(@Body() dto: RetryActivationDto) {
    return await this.authService.retryActive(dto.email);
  }

  @Public()
  @Post('forgot-password')
  @ResponseMessage('Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotAuthDto) {
    return await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('change-password')
  @ResponseMessage('Mật khẩu của bạn đã được thay đổi thành công!')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() changePasswordAuthDto: ChangePasswordAuthDto) {
    return await this.authService.changePassword(changePasswordAuthDto);
  }
  @Public() // Endpoint này phải public để client có thể gọi nó mà không cần token cũ
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token đã được làm mới thành công')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    // Logic trong AuthService để kiểm tra refreshToken và tạo access token mới
    return this.authService.refreshAccessToken(dto.refreshToken);
  }
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Thông tin người dùng')
  @HttpCode(HttpStatus.OK)
  getProfile(@User() user: IUser) {
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin người dùng được xác thực.');
    }
    return user;
  }


  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {

  }


  @Public()
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  // async googleAuthRedirect(@Req() req, @Res() res: Response) 
  async googleAuthRedirect(@Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('Đăng nhập bằng Google thất bại hoặc không có thông tin người dùng.');
    }
    // const tokens = await this.authService.login(req.user);
    return await this.authService.login(req.user);
    // return res.redirect(
    //   `http://localhost:3000/#accessToken=${tokens.access_token}&refreshToken=${tokens.refresh_token}`
    // );

  }
}