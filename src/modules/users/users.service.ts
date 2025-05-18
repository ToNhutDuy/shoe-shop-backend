import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateEmailVerificationTokenDto, UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus } from './entities/user.entity';
import { Like, Repository } from 'typeorm';
import { hashPasswordUtil } from '../common/helpers/util';
import { UserHelper } from './helpers/user.helper';
import { UserResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from '../common/dto/pagination.dto';

import { v4 as uuidv4 } from 'uuid';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import * as dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from '../auth/dto/register.dto';
import { ChangePasswordAuthDto } from '../auth/dto/forgot-auth.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    private readonly userHelper: UserHelper,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) { }



  async create(createUserDto: CreateUserDto) {
    const { fullName, email, password, phoneNumber, role } = createUserDto;
    const roleId = role ?? 1;
    //Check email
    await this.userHelper.checkEmailExist(email);

    //Check role

    await this.userHelper.checkRoleExist(roleId);

    //Hash password
    const hashPassword = await hashPasswordUtil(password);
    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }
    //Create a user
    const user = await this.userRepository.create({
      fullName, email, password: hashPassword, phoneNumber, role: { id: roleId }
    })
    const savedUser = await this.userRepository.save(user);


    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });

  }

  async findAll(
    query: string,
    current: number,
    pageSize: number,
    sort?: string // thêm sort từ query param
  ) {
    current = current ?? 1;
    pageSize = pageSize ?? 10;

    current = Math.max(1, current);
    pageSize = Math.max(1, Math.min(pageSize, 100));

    if (typeof query !== 'string') {
      query = '';
    }

    if (query.length > 100) {
      throw new BadRequestException('Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)');
    }

    const where = query ? { fullName: Like(`%${query}%`) } : {};

    // Xử lý sort
    let order: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' }; // mặc định sắp xếp theo id
    if (sort) {
      const [field, direction] = sort.split(':');
      const dir = direction?.toUpperCase();
      if (['ASC', 'DESC'].includes(dir)) {
        order = { [field]: dir as 'ASC' | 'DESC' };
      }
    }

    const [data, total] = await this.userRepository.findAndCount({
      where,
      order,
      skip: (current - 1) * pageSize,
      take: pageSize,
      relations: ['role'],
    });


    const dataWithoutPassword = data.map(user =>
      plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true })
    );
    return {
      data: dataWithoutPassword,
      pagination: {
        current,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    } satisfies PaginationDto<UserResponseDto>;
  }

  async findOne(_id: number) {

    const user = await this.userHelper.checkUserExist(_id);
    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }
  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Kiểm tra user có tồn tại không
    const user = await this.userHelper.checkUserExist(id);

    const { fullName, phoneNumber } = updateUserDto;
    const updateData: Partial<User> = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    await this.userRepository.update({ id }, updateData);
    const updatedUser = await this.userRepository.findOne({ where: { id }, relations: ['role'] });

    return plainToInstance(UserResponseDto, updatedUser, { excludeExtraneousValues: true });
  }


  async remove(_id: number) {
    // Kiểm tra user tồn tại
    await this.userHelper.checkUserExist(_id);
    await this.userRepository.delete(_id);
    return { message: 'Xóa user thành công' };
  }

  private async createEmailVerificationToken(
    user: User,
    expiresInDays: number,
    token: string,
  ): Promise<EmailVerificationToken> {
    const expiresAt = dayjs().add(expiresInDays, 'minutes').toDate();

    const emailToken = this.emailTokenRepo.create({
      user,
      token,
      expiresAt,
    });

    return await this.emailTokenRepo.save(emailToken);
  }

  private async sendActivationEmail(user: User, token: string, textSubject?: string, textTemplate?: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: textSubject,
        template: textTemplate,
        context: {
          name: user?.fullName ?? user.email,
          activationCode: token,
        },
      });
    } catch (err) {
      console.error('Lỗi gửi email kích hoạt:', err);
      throw new BadRequestException('Không thể gửi email xác thực');
    }
  }

  async handleRegister(registerDto: RegisterAuthDto): Promise<UserResponseDto> {
    const { fullName, email, password, phoneNumber } = registerDto;

    // Kiểm tra email tồn tại
    await this.userHelper.checkEmailExist(email);

    // Kiểm tra độ dài mật khẩu
    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }

    const hashPassword = await hashPasswordUtil(password);

    const newUser = this.userRepository.create({
      fullName,
      email,
      password: hashPassword,
      phoneNumber,
      role: { id: 1 },
      status: UserStatus.INACTIVE,
    });

    const savedUser = await this.userRepository.save(newUser);

    const token = uuidv4();
    const tokenExpiry = this.configService.get<number>('EMAIL_TOKEN_EXPIRES_IN_DAYS') ?? 5;

    await this.createEmailVerificationToken(savedUser, tokenExpiry, token);

    //Content email
    const textSubject = 'Activate your account at @Shoe-shop';
    const textTemplate = 'register';

    await this.sendActivationEmail(savedUser, token, textSubject, textTemplate);

    return plainToInstance(UserResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async handleActive(checkCodeTokenAuthDto: CheckCodeTokenAuthDto) {
    const { id, token } = checkCodeTokenAuthDto;

    const emailToken = await this.emailTokenRepo.findOne({
      where: { user: { id }, token },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Token không hợp lệ');
    }

    if (dayjs(emailToken.expiresAt).isBefore(dayjs())) {
      throw new BadRequestException('Token đã hết hạn');
    }

    const user = emailToken.user;
    user.status = UserStatus.ACTIVE;

    await this.userRepository.save(user);
    await this.emailTokenRepo.delete({ id: emailToken.id });

    return { message: 'Tài khoản đã được kích hoạt thành công' };
  }
  private async updateEmailVerificationToken(
    user: User,
    expiresInMinutes: number,
    token: string,
  ) {
    const expiresAt = dayjs().add(expiresInMinutes, 'minutes').toDate();

    const existingToken = await this.emailTokenRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });

    if (existingToken) {
      existingToken.token = token;
      existingToken.expiresAt = expiresAt;
      await this.emailTokenRepo.save(existingToken);
    } else {
      const newToken = this.emailTokenRepo.create({
        user: user,
        token,
        expiresAt,
      });
      await this.emailTokenRepo.save(newToken);
    }
  }

  async retryActive(email: string) {
    const user = await this.userHelper.checkEmailNotExist(email);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException("Tài khoản đã được kích hoạt");
    }
    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException("Tài khoản đã bị khóa");
    }

    const token = uuidv4();
    const tokenExpiry = this.configService.get<number>('EMAIL_TOKEN_EXPIRES_IN_DAYS') ?? 5;

    await this.updateEmailVerificationToken(user, tokenExpiry, token);
    //Content email
    const textSubject = 'retry activate your account at @Shoe-shop';
    const textTemplate = 'register';

    await this.sendActivationEmail(user, token, textSubject, textTemplate);

    return { id: user.id, message: 'Email kích hoạt đã được gửi lại' };
  }
  async forgotPassword(email: string) {
    const user = await this.userHelper.checkEmailNotExist(email);
    const token = uuidv4();
    const tokenExpiry = this.configService.get<number>('EMAIL_TOKEN_EXPIRES_IN_DAYS') ?? 5;

    await this.updateEmailVerificationToken(user, tokenExpiry, token);

    //Content email
    const textSubject = 'Change your password account at @Shoe-shop';
    const textTemplate = 'register';

    await this.sendActivationEmail(user, token, textSubject, textTemplate);

    return { id: user.id, email: user.email, message: 'Email forgot đã được gửi lại' };
  }

  async changePassword(changePasswordAuthDto: ChangePasswordAuthDto) {
    const { email, password, confirmPassword, code } = changePasswordAuthDto;

    if (password !== confirmPassword) {
      throw new BadRequestException(`Xác nhận mật khẩu không chính xác`);
    }

    const user = await this.userHelper.checkEmailNotExist(email);

    const emailToken = await this.emailTokenRepo.findOne({
      where: { user: { id: user.id }, token: code },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Mã xác nhận không hợp lệ');
    }

    if (dayjs(emailToken.expiresAt).isBefore(dayjs())) {
      throw new BadRequestException('Token đã hết hạn');
    }

    const newPassword = await hashPasswordUtil(password);
    user.password = newPassword;
    await this.userRepository.save(user);

    // Xoá token để không tái sử dụng
    await this.emailTokenRepo.remove(emailToken);

    return { id: user.id, message: 'Cập nhật password thành công' };
  }
}
