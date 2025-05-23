import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus, AccountType } from './entities/user.entity';
import { Like, Repository } from 'typeorm';
import { UserHelper } from './helpers/user.helper';
import { UsersResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { v4 as uuidv4 } from 'uuid';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import * as dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { CheckCodeTokenAuthDto, RegisterAuthDto } from '../auth/dto/register.dto';
import { ChangePasswordAuthDto } from '../auth/dto/forgot-auth.dto';
import { hashPasswordUtil } from 'src/common/helpers/util';
import { Address } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    private readonly userHelper: UserHelper,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) { }


  async create(createUserDto: CreateUserDto): Promise<User> {
    const { fullName, email, password, phoneNumber, role } = createUserDto;
    const roleId = role ?? 1;

    // Kiểm tra email
    await this.userHelper.checkEmailExist(email);
    // Kiểm tra role
    await this.userHelper.checkRoleExist(roleId);
    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }
    const hashedPassword = await hashPasswordUtil(password);

    // Tạo người dùng mới
    const newUser = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: { id: roleId },
      accountType: AccountType.LOCAL,
      status: UserStatus.INACTIVE,
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Không thể tạo người dùng.');
    }
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
  async createWithGoogle(profile: any): Promise<User> {
    // Kiểm tra trùng email 
    const email = profile.emails[0].value;
    const existingUserByEmail = await this.findByEmail(email);
    if (existingUserByEmail) {
      // Nếu email đã được đăng ký bằng tài khoản local
      if (existingUserByEmail.accountType === AccountType.LOCAL) {
        throw new BadRequestException('Email này đã được đăng ký bằng tài khoản thường.');
      }
      // Nếu email đã được đăng ký bằng một tài khoản Google nhưng Google ID không khớp
      if (existingUserByEmail.accountType === AccountType.GOOGLE && existingUserByEmail.googleId !== profile.id) {
        throw new BadRequestException('Email đã được liên kết với một tài khoản Google khác.');
      }
      return existingUserByEmail;
    }

    // Tạo người dùng mới
    const newUser = this.usersRepository.create({
      password: null,
      email: email,
      fullName: profile.displayName,
      accountType: AccountType.GOOGLE,
      googleId: profile.id,
      status: UserStatus.ACTIVE,
      role: { id: 1 },
    });

    try {

      return await this.usersRepository.save(newUser);
    } catch (error) {
      console.error('Error creating Google user:', error);
      throw new InternalServerErrorException('Không thể tạo người dùng Google.');
    }
  }


  async findAll(
    query: string,
    current: number,
    pageSize: number,
    sort?: string
  ): Promise<PaginationDto<UsersResponseDto>> {
    current = current ?? 1;
    pageSize = pageSize ?? 10;

    current = Math.max(1, current);
    pageSize = Math.max(1, Math.min(pageSize, 100));

    if (typeof query !== 'string') {
      query = '';
    }

    if (query.length > 100) {
      throw new BadRequestException('Từ khóa tìm kiếm quá dài (tối đa 100 ký tự)!');
    }

    const where = query ? { fullName: Like(`%${query}%`) } : {};

    // Xử lý sort
    let order: Record<string, 'ASC' | 'DESC'> = { id: 'DESC' }; // mặc định sắp xếp theo id
    if (sort) {
      const [field, direction] = sort.split(':');
      const dir = direction?.toUpperCase();
      if (['ASC', 'DESC'].includes(dir) && ['id', 'email', 'fullName', 'createdAt', 'updatedAt'].includes(field)) { // Chỉ cho phép sắp xếp theo các trường hợp lệ
        order = { [field]: dir as 'ASC' | 'DESC' };
      }
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      order,
      skip: (current - 1) * pageSize,
      take: pageSize,
      relations: ['role'],
    });

    const dataWithoutPassword = data.map(user =>
      plainToInstance(UsersResponseDto, user, { excludeExtraneousValues: true })
    );
    return {
      data: dataWithoutPassword,
      pagination: {
        current,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    } satisfies PaginationDto<UsersResponseDto>;
  }

  async findOne(_id: number): Promise<UsersResponseDto> {
    const user = await this.userHelper.checkUserExist(_id);
    return plainToInstance(UsersResponseDto, user, { excludeExtraneousValues: true });
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với email "${email}".`);
    }
    return user;
  }

  async findOneByGoogleId(googleId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { googleId } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với Google ID "${googleId}".`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<UsersResponseDto> {
    // Kiểm tra user có tồn tại không
    const user = await this.userHelper.checkUserExist(id);

    const { fullName, phoneNumber } = updateUserDto;
    const updateData: Partial<User> = {};

    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    // Cập nhật người dùng
    await this.usersRepository.update({ id }, updateData);
    const updatedUser = await this.usersRepository.findOne({ where: { id }, relations: ['role'] });

    return plainToInstance(UsersResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  async remove(_id: number): Promise<{ message: string }> {
    // Kiểm tra user tồn tại
    await this.userHelper.checkUserExist(_id);
    await this.usersRepository.delete(_id);
    return { message: 'Xóa user thành công' };
  }

  // Các phương thức private cho token và email
  private async createEmailVerificationToken(
    user: User,
    expiresInMinutes: number, // Đổi tên tham số cho rõ ràng
    token: string,
  ): Promise<EmailVerificationToken> {
    const expiresAt = dayjs().add(expiresInMinutes, 'minutes').toDate();

    const emailToken = this.emailVerificationTokenRepository.create({
      user,
      token,
      expiresAt,
    });

    return await this.emailVerificationTokenRepository.save(emailToken);
  }

  private async createPasswordResetToken(
    user: User,
    expiresInMinutes: number,
    token: string,
  ): Promise<PasswordResetToken> {
    const expiresAt = dayjs().add(expiresInMinutes, 'minutes').toDate();

    const resetToken = this.passwordResetTokenRepository.create({
      user,
      token,
      expiresAt,
    });

    return await this.passwordResetTokenRepository.save(resetToken);
  }

  private async updateEmailVerificationToken(
    user: User,
    expiresInMinutes: number,
    token: string,
  ): Promise<EmailVerificationToken> {
    const expiresAt = dayjs().add(expiresInMinutes, 'minutes').toDate();

    const existingToken = await this.emailVerificationTokenRepository.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });

    if (existingToken) {
      existingToken.token = token;
      existingToken.expiresAt = expiresAt;
      return await this.emailVerificationTokenRepository.save(existingToken);
    } else {
      const newToken = this.emailVerificationTokenRepository.create({
        user: user,
        token,
        expiresAt,
      });
      return await this.emailVerificationTokenRepository.save(newToken);
    }
  }


  private async sendEmail(user: User, token: string, subject: string, template: string, expiresInMinutes: number): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: subject,
        template: template,
        context: {
          name: user?.fullName ?? user.email,
          activationCode: token,
          expiresInMinutes: expiresInMinutes,
        },
      });
    } catch (err) {
      console.error('Lỗi gửi email:', err);
      throw new InternalServerErrorException('Không thể gửi email xác thực. Vui lòng kiểm tra cấu hình email.');
    }
  }

  async handleRegister(registerDto: RegisterAuthDto): Promise<UsersResponseDto> {
    const { fullName, email, password, phoneNumber } = registerDto;


    const existingUserByEmail = await this.findByEmail(email);
    if (existingUserByEmail && existingUserByEmail.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Email này đã được đăng ký bằng tài khoản google.');
    }

    // checkEmailExist() sẽ ném lỗi nếu email đã tồn tại
    await this.userHelper.checkEmailExist(email);

    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }

    const hashedPassword = await hashPasswordUtil(password);

    const newUser = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: { id: 1 },
      status: UserStatus.INACTIVE,
      accountType: AccountType.LOCAL,
    });

    const savedUser = await this.usersRepository.save(newUser);

    const token = uuidv4();
    const tokenExpiryMinutes = this.configService.get<number>('EMAIL_TOKEN_EXPIRES_IN_MINUTES') ?? 60;

    await this.createEmailVerificationToken(savedUser, tokenExpiryMinutes, token);

    await this.sendEmail(savedUser, token, 'Activate your account at @Shoe-shop', 'register', tokenExpiryMinutes);

    return plainToInstance(UsersResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async handleActive(checkCodeTokenAuthDto: CheckCodeTokenAuthDto): Promise<{ message: string }> {
    const { id, token } = checkCodeTokenAuthDto;

    const emailToken = await this.emailVerificationTokenRepository.findOne({
      where: { user: { id }, token },
      relations: ['user'],
    });

    if (!emailToken) {
      throw new BadRequestException('Mã kích hoạt không hợp lệ.');
    }

    if (dayjs(emailToken.expiresAt).isBefore(dayjs())) {
      throw new BadRequestException('Mã kích hoạt đã hết hạn.');
    }

    const user = emailToken.user;
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt rồi.');
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    await this.usersRepository.save(user);

    await this.emailVerificationTokenRepository.remove(emailToken); // Xóa token sau khi kích hoạt

    return { message: 'Tài khoản đã được kích hoạt thành công.' };
  }

  async retryActive(email: string): Promise<{ id: number; message: string }> {
    const user = await this.userHelper.checkEmailExistOrThrow(email);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException("Tài khoản đã được kích hoạt.");
    }
    if (user.status === UserStatus.BANNED) {
      throw new BadRequestException("Tài khoản đã bị khóa.");
    }
    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException("Tài khoản này được đăng ký bằng Google và không cần kích hoạt qua email.");
    }

    const token = uuidv4();
    const tokenExpiryMinutes = this.configService.get<number>('EMAIL_TOKEN_EXPIRES_IN_MINUTES') ?? 60;

    await this.updateEmailVerificationToken(user, tokenExpiryMinutes, token);

    await this.sendEmail(user, token, 'Gửi lại mã kích hoạt tài khoản của bạn tại @Shoe-shop', 'register', tokenExpiryMinutes);

    return { id: user.id, message: 'Email kích hoạt mới đã được gửi lại.' };
  }

  async forgotPassword(email: string): Promise<{ id: number; email: string; message: string }> {
    const user = await this.userHelper.checkEmailExistOrThrow(email);

    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản này được đăng ký bằng Google. Vui lòng sử dụng phương thức khôi phục của Google.');
    }

    const token = uuidv4();
    const tokenExpiryMinutes = this.configService.get<number>('PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES') ?? 60;
    // Xóa các token đặt lại mật khẩu cũ của người dùng này 
    await this.passwordResetTokenRepository.delete({ user: { id: user.id } });
    await this.createPasswordResetToken(user, tokenExpiryMinutes, token);

    await this.sendEmail(user, token, 'Yêu cầu đặt lại mật khẩu của bạn tại @Shoe-shop', 'forgot-password', tokenExpiryMinutes);
    return { id: user.id, email: user.email, message: 'Email đặt lại mật khẩu đã được gửi.' };
  }

  async changePassword(changePasswordAuthDto: ChangePasswordAuthDto): Promise<{ id: number; message: string }> {
    const { email, password, confirmPassword, code } = changePasswordAuthDto;

    if (password !== confirmPassword) {
      throw new BadRequestException(`Xác nhận mật khẩu không chính xác.`);
    }
    if (password.length < 8) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const user = await this.userHelper.checkEmailExistOrThrow(email);

    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản này được đăng ký bằng Google và không cần thay đổi mật khẩu.');
    }

    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { user: { id: user.id }, token: code },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    if (!resetToken) {
      throw new BadRequestException('Mã đặt lại mật khẩu không hợp lệ.');
    }

    if (dayjs(resetToken.expiresAt).isBefore(dayjs())) {
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn.');
    }

    const newHashedPassword = await hashPasswordUtil(password);
    user.password = newHashedPassword;
    await this.usersRepository.save(user);

    // Xóa token sau khi sử dụng
    await this.passwordResetTokenRepository.remove(resetToken);

    return { id: user.id, message: 'Mật khẩu đã được cập nhật thành công.' };
  }
  async findById(id: number) {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async createAddress(userId: number, createAddressDto: CreateAddressDto): Promise<Address> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (createAddressDto.isDefault) {
      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true },
        { isDefault: false }
      );
    }

    const address = this.addressesRepository.create({ ...createAddressDto, user });
    return this.addressesRepository.save(address);
  }


  async getAddressesByUserId(userId: number): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', id: 'ASC' },
    });
  }


  async getAddressById(addressId: number, userId: number): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user: { id: userId } },
    });
    if (!address) {
      throw new NotFoundException('Địa chỉ không tồn tại hoặc không thuộc về người dùng này.');
    }
    return address;
  }


  async updateAddress(
    addressId: number,
    userId: number,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {

    const address = await this.getAddressById(addressId, userId);


    if (updateAddressDto.isDefault !== undefined && updateAddressDto.isDefault === true) {
      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true },
        { isDefault: false }
      );
    }

    Object.assign(address, updateAddressDto);
    return this.addressesRepository.save(address);
  }


  async deleteAddress(addressId: number, userId: number): Promise<void> {
    const result = await this.addressesRepository.delete({ id: addressId, user: { id: userId } });
    if (result.affected === 0) {
      throw new NotFoundException('Địa chỉ không tồn tại hoặc không thuộc về người dùng này.');
    }
  }
}