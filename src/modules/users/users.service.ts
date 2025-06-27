import {
  BadRequestException, Injectable, InternalServerErrorException,
  NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserStatus, AccountType } from './entities/user.entity';
import { FindOptionsOrder, FindOptionsWhere, Like, Repository, Not } from 'typeorm';
import { UserHelper } from './helpers/user.helper';
import { UsersResponseDto } from './dto/user-response.dto';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

import { Address } from './entities/address.entity';
import { hashBcryptUtil } from 'src/common/helpers/util';
import { CreateUserZodDto, UpdateUserZodDto } from './dto/user-zod.dto';
import { ChangePasswordZodDto, CheckCodeZodDto, ForgotPasswordZodDto, RegisterZodDto } from '../auth/dto/auth-zod.dto';
import { CreateAddressZodDto, UpdateAddressZodDto } from './dto/address-zod.dto';
import { Roles } from '../roles/entities/role.entity';
import { EmailVerificationCode } from './entities/email-verification-code.entity';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { PaginatedResponse } from 'src/common/dto/pagination.dto';
import { IUser } from './interfaces/user.interface';
import { RolesService } from '../roles/roles.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { MediaService } from '../media/media.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(EmailVerificationCode)
    private readonly emailVerificationCodeRepository: Repository<EmailVerificationCode>,
    @InjectRepository(PasswordResetCode)
    private readonly passwordResetCodeRepository: Repository<PasswordResetCode>,
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
    private readonly userHelper: UserHelper,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    @InjectRepository(Roles)
    private readonly rolesRepository: Repository<Roles>,
    private readonly rolesService: RolesService,

    private readonly mediaService: MediaService,
  ) { }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }
  async getUserPermissions(userId: number) {
    const user = await this.userHelper.checkUserExist(userId);

    const role = await this.rolesService.getRoleById(user.role_id);

    return {
      id: role.id,
      name: role.name,
      permissions: role.permissions || [],
    };
  }

  async create(dataUser: CreateUserZodDto): Promise<UsersResponseDto> {
    const { fullName, email, password, phoneNumber, role } = dataUser;


    const roleId = role ?? 1;

    await this.userHelper.checkEmailExist(email);
    await this.userHelper.checkRoleExist(roleId);

    const hashedPassword = await hashBcryptUtil(password);

    const newUserEntity = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      phoneNumber,
      role: { id: roleId },
      accountType: AccountType.LOCAL,
      status: UserStatus.INACTIVE,
    });

    try {
      const savedUser = await this.usersRepository.save(newUserEntity);

      return plainToInstance(UsersResponseDto, savedUser, { excludeExtraneousValues: true });
    } catch (error) {
      this.logger.error(`Error creating user: ${email}`, error.stack);

      if (error.code === '23505') {
        throw new ConflictException('Email hoặc thông tin khác đã tồn tại.');
      }
      throw new InternalServerErrorException('Không thể tạo người dùng. Vui lòng thử lại sau.');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }
  async updateProfile(userId: number, avatar: string | null): Promise<User> {

    const user = await this.userHelper.checkUserExist(userId);
    if (user.avatar) {
      await this.mediaService.deleteFileFromDisk(user.avatar);
    }
    if (avatar) {
      user.avatar = avatar;
    }
    return this.usersRepository.save(user);
  }
  async createWithGoogle(profile: any): Promise<User> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      this.logger.error('Google profile missing email', profile);
      throw new BadRequestException('Không thể lấy email từ hồ sơ Google.');
    }

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      if (existingUser.accountType === AccountType.LOCAL) {
        throw new ConflictException('Email này đã được đăng ký bằng tài khoản thường. Vui lòng đăng nhập bằng tài khoản cục bộ của bạn.');
      }
      if (existingUser.accountType === AccountType.GOOGLE && existingUser.googleId !== profile.id) {
        throw new ConflictException('Email đã được liên kết với một tài khoản Google khác.');
      }

      return existingUser;
    }

    const newUser = this.usersRepository.create({
      password: null,
      email: email,
      fullName: profile.displayName || email,
      accountType: AccountType.GOOGLE,
      googleId: profile.id,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      role: { id: 1 },
    });

    try {
      return await this.usersRepository.save(newUser);
    } catch (error) {
      this.logger.error(`Error creating Google user for email: ${email}`, error.stack);
      if (error.code === '23505') {
        throw new ConflictException('Lỗi khi tạo tài khoản Google, thông tin có thể đã tồn tại.');
      }
      throw new InternalServerErrorException('Không thể tạo người dùng Google. Vui lòng thử lại sau.');
    }
  }



  async findAllUsers(
    search?: string,
    currentInput?: number,
    pageSizeInput?: number,
    sortInput?: string,
  ): Promise<PaginatedResponse<UsersResponseDto>> {
    const current = Math.max(1, currentInput ?? 1);
    const pageSize = Math.max(1, Math.min(pageSizeInput ?? 10, 100));

    const where: FindOptionsWhere<IUser> | FindOptionsWhere<IUser>[] = search
      ? { fullName: Like(`%${search}%`) }
      : {};

    let order: FindOptionsOrder<IUser> = { id: 'DESC' };

    if (sortInput) {
      const [field, direction] = sortInput.split(':');
      const dir = direction?.toUpperCase();
      const allowedSortFields = ['id', 'email', 'fullName', 'createdAt', 'updatedAt', 'status'];

      if (['ASC', 'DESC'].includes(dir) && allowedSortFields.includes(field)) {
        order = { [field]: dir as 'ASC' | 'DESC' };
      } else {
        this.logger.warn(`Sort không hợp lệ: "${sortInput}". Dùng mặc định.`);
      }
    }

    const [data, totalItems] = await this.usersRepository.findAndCount({
      where,
      order,
      skip: (current - 1) * pageSize,
      take: pageSize,
      relations: ['role'],
    });

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: data.map(user =>
        plainToInstance(UsersResponseDto, user, { excludeExtraneousValues: true }),
      ),
      meta: {
        currentPage: current,
        itemCount: data.length,
        itemsPerPage: pageSize,
        totalItems,
        totalPages,
        hasNextPage: current < totalPages,
        hasPreviousPage: current > 1,
      },
    };
  }



  async findOneUserById(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        'role',
        'role.rolePermissions',
        'role.rolePermissions.permission',
        'addresses',
      ],
    });

    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id}.`);
    }

    return user;
  }



  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserData: UpdateUserZodDto): Promise<UsersResponseDto> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${id} để cập nhật.`);
    }


    Object.assign(user, updateUserData);

    if (updateUserData.status !== undefined && updateUserData.status !== null) {
      user.status = updateUserData.status;
    }
    if (updateUserData.email !== undefined) {
      const existingUser = await this.usersRepository.findOneBy({ email: updateUserData.email });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email đã được sử dụng bởi người dùng khác.');
      }
      user.email = updateUserData.email;
    }
    if (updateUserData.role !== undefined) {
      const roleId = updateUserData.role;
      const roleEntity = await this.rolesRepository.findOneBy({ id: roleId });
      if (!roleEntity) {
        throw new BadRequestException(`Role với ID #${roleId} không tồn tại.`);
      }
      user.role = roleEntity;
    }


    try {
      const updatedUser = await this.usersRepository.save(user);
      return plainToInstance(UsersResponseDto, updatedUser, { excludeExtraneousValues: true });
    } catch (error) {
      this.logger.error(`Lỗi update người dùng ID ${id}`, error.stack);
      throw new InternalServerErrorException('Không thể cập nhật người dùng.');
    }
  }

  async remove(userId: number): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID #${userId} để xóa.`);
    }

    await this.emailVerificationCodeRepository.delete({ user: { id: userId } });
    await this.passwordResetCodeRepository.delete({ user: { id: userId } });
    await this.addressesRepository.delete({ user: { id: userId } });

    if (user.avatar) {
      await this.mediaService.deleteFileFromDisk(user.avatar);
    }
    const deleteResult = await this.usersRepository.delete(userId);
    if (deleteResult.affected === 0) {

      throw new InternalServerErrorException(`Không thể xóa người dùng ID #${userId} mặc dù đã tìm thấy trước đó.`);
    }
    this.logger.log(`User ID #${userId} và dữ liệu liên quan đã được xóa thành công.`);
  }

  private async sendEmail(user: User, code: string, subject: string, template: string, expiresInMinutes: number): Promise<void> {
    try {
      const clientUrl = this.configService.get<string>('CLIENT_URL');
      if (!clientUrl) {
        this.logger.error('CLIENT_URL is not configured for email templates.');
        throw new InternalServerErrorException('Lỗi cấu hình hệ thống email (CLIENT_URL).');
      }
      await this.mailerService.sendMail({
        to: user.email,
        subject: subject,
        template: template,
        context: {
          name: user.fullName || user.email,
          activationCode: code,
          expiresInMinutes: expiresInMinutes,
        },
      });
      this.logger.log(`Email "${subject}" sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Lỗi gửi email đến ${user.email} với chủ đề "${subject}"`, err.stack);
      throw new InternalServerErrorException('Không thể gửi email. Vui lòng thử lại sau.');
    }
  }

  async createOrUpdateEmailVerificationCode(user: User, expiryMinutes: number, code: string): Promise<EmailVerificationCode> {
    let existingCode = await this.emailVerificationCodeRepository.findOne({ where: { user: { id: user.id } } });

    const expiresAt = dayjs().add(expiryMinutes, 'minutes').toDate();

    if (existingCode) {
      existingCode.code = code;
      existingCode.expiresAt = expiresAt;
      this.logger.debug(`Updating email verification token for user ${user.id}`);
      return this.emailVerificationCodeRepository.save(existingCode);
    } else {
      const newCode = this.emailVerificationCodeRepository.create({
        user: user,
        code: code,
        expiresAt: expiresAt,
      });
      this.logger.debug(`Creating new email verification token for user ${user.id}`);
      return this.emailVerificationCodeRepository.save(newCode);
    }
  }

  async createPasswordResetCode(user: User, expiryMinutes: number, code: string): Promise<PasswordResetCode> {

    const expiresAt = dayjs().add(expiryMinutes, 'minutes').toDate();

    let existingCode = await this.passwordResetCodeRepository.findOne({ where: { user: { id: user.id } } });

    if (existingCode) {
      existingCode.code = code;
      existingCode.expiresAt = expiresAt;
      this.logger.debug(`Updating password reset token for user ${user.id}`);
      return this.passwordResetCodeRepository.save(existingCode);
    } else {
      const newCode = this.passwordResetCodeRepository.create({
        user: user,
        code: code,
        expiresAt: expiresAt,
      });
      this.logger.debug(`Creating new password reset token for user ${user.id}`);
      return this.passwordResetCodeRepository.save(newCode);
    }
  }


  async handleRegister(registerDto: RegisterZodDto): Promise<UsersResponseDto> {
    const { fullName, email, password, confirmPassword } = registerDto;

    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      if (existingUser.accountType === AccountType.GOOGLE) {
        throw new ConflictException('Email này đã được đăng ký bằng tài khoản Google. Vui lòng đăng nhập bằng Google.');
      }
      throw new ConflictException('Email này đã được đăng ký.');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Xác nhận mật khẩu không chính xác.');
    }

    const hashedPassword = await hashBcryptUtil(password);

    const newUserEntity = this.usersRepository.create({
      fullName,
      email,
      password: hashedPassword,
      role: { id: 1 },
      status: UserStatus.INACTIVE,
      accountType: AccountType.LOCAL,
    });

    const savedUser = await this.usersRepository.save(newUserEntity);

    const code = uuidv4().slice(0, 6);
    const codeExpiryMinutes = parseInt(this.configService.get<string>('EMAIL_CODE_EXPIRES_IN_MINUTES', '15'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid EMAIL_CODE_EXPIRES_IN_MINUTES, using default 15.`);
    }

    await this.createOrUpdateEmailVerificationCode(savedUser, codeExpiryMinutes, code);
    await this.sendEmail(savedUser, code, 'Kích hoạt tài khoản của bạn tại Shoe-shop', 'register', codeExpiryMinutes);

    return plainToInstance(UsersResponseDto, savedUser, { excludeExtraneousValues: true });
  }

  async handleActive(checkCodeData: CheckCodeZodDto): Promise<UsersResponseDto> {
    const { email, code, } = checkCodeData;
    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['emailVerificationCode'],
    });

    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt trước đó.');
    }

    if (!user.emailVerificationCode) {
      throw new BadRequestException('Không tìm thấy mã xác thực cho tài khoản này.');
    }

    if (user.emailVerificationCode.code !== code) {
      throw new BadRequestException('Mã xác thực không chính xác.');
    }

    if (dayjs().isAfter(dayjs(user.emailVerificationCode.expiresAt))) {
      throw new BadRequestException('Mã xác thực đã hết hạn, vui lòng yêu cầu gửi lại.');
    }

    user.status = UserStatus.ACTIVE;
    user.emailVerifiedAt = new Date();
    await this.emailVerificationCodeRepository.delete({ id: user.emailVerificationCode.id });
    const updatedUser = await this.usersRepository.save(user);

    return plainToInstance(UsersResponseDto, updatedUser, { excludeExtraneousValues: true });
  }

  async retryActive(email: string): Promise<void> {
    const user = await this.usersRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại.');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt. Không cần gửi lại mã.');
    }
    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản Google không yêu cầu kích hoạt email.');
    }

    const code = uuidv4().slice(0, 6);
    const codeExpiryMinutes = parseInt(this.configService.get<string>('EMAIL_CODE_EXPIRES_IN_MINUTES', '15'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid EMAIL_CODE_EXPIRES_IN_MINUTES, using default 15.`);
    }

    await this.createOrUpdateEmailVerificationCode(user, codeExpiryMinutes, code);
    await this.sendEmail(user, code, 'Yêu cầu mã kích hoạt tài khoản của bạn tại Shoe-shop', 'activation', codeExpiryMinutes);
  }

  async forgotPassword(data: ForgotPasswordZodDto): Promise<void> {
    const user = await this.userHelper.checkEmailExistOrThrow(data.email);
    if (user.accountType === AccountType.GOOGLE) {
      throw new BadRequestException('Tài khoản này được đăng ký bằng Google. Vui lòng sử dụng quy trình khôi phục mật khẩu của Google.');
    }

    const codeExpiryMinutes = parseInt(this.configService.get<string>('PASSWORD_RESET_CODE_EXPIRES_IN_MINUTES', '30'), 10);
    if (isNaN(codeExpiryMinutes) || codeExpiryMinutes <= 0) {
      this.logger.warn(`Invalid PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES, using default 30.`);
    }
    const code = uuidv4().slice(0, 6);
    await this.createPasswordResetCode(user, codeExpiryMinutes, code);
    await this.sendEmail(user, code, 'Yêu cầu đặt lại mật khẩu của bạn', 'forgot-password', codeExpiryMinutes);
  }

  async changePassword(changePasswordData: ChangePasswordZodDto): Promise<void> {
    const { email, code, password, confirmPassword } = changePasswordData;

    this.logger.log(`Attempting to change password for email: ${email}`);

    if (password !== confirmPassword) {
      this.logger.warn(`Password change failed for ${email}: New password and confirmation do not match.`);
      throw new BadRequestException('Xác nhận mật khẩu mới không chính xác.');
    }

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['passwordResetCodes'],
    });

    if (!user) {
      this.logger.warn(`Password change failed for non-existent user: ${email}`);
      throw new NotFoundException('Người dùng không tồn tại.');
    }

    if (user.accountType === AccountType.GOOGLE) {
      this.logger.warn(`Password change attempted for Google account: ${email}`);
      throw new BadRequestException('Không thể thay đổi mật khẩu cho tài khoản Google. Vui lòng sử dụng quy trình khôi phục mật khẩu của Google.');
    }


    if (!user.passwordResetCodes) {
      this.logger.warn(`Password change failed for ${email}: No password reset token found.`);
      throw new BadRequestException('Không tìm thấy yêu cầu đặt lại mật khẩu. Vui lòng yêu cầu đặt lại mật khẩu mới.');
    }


    if (user.passwordResetCodes.code !== code) {
      this.logger.warn(`Password change failed for ${email}: Invalid reset token provided.`);

      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id });
      throw new BadRequestException('Mã đặt lại mật khẩu không chính xác hoặc đã bị sử dụng.');
    }

    if (dayjs().isAfter(dayjs(user.passwordResetCodes.expiresAt))) {
      this.logger.warn(`Password change failed for ${email}: Expired reset code.`);

      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id });
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu gửi lại.');
    }

    try {
      user.password = await hashBcryptUtil(password);
      await this.passwordResetCodeRepository.delete({ id: user.passwordResetCodes.id });
      await this.usersRepository.save(user);
      this.logger.log(`Password successfully changed for user: ${email}`);
    } catch (error) {
      this.logger.error(`Error saving new password for user ${email}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Không thể thay đổi mật khẩu. Vui lòng thử lại sau.');
    }
  }

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`Attempt to update refresh token for non-existent user ID: ${userId}`);
      throw new NotFoundException('Người dùng không tồn tại.');
    }
    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);
    this.logger.debug(`Refresh token updated for user ID: ${userId}`);
  }

  async createAddress(userId: number, createAddressData: CreateAddressZodDto): Promise<AddressResponseDto> {
    const user = await this.userHelper.checkUserExist(userId);

    if (createAddressData.isDefault) {
      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true },
        { isDefault: false },
      );
    }

    const newAddress = this.addressesRepository.create({
      ...createAddressData,
      user,
    });

    try {
      const savedAddress = await this.addressesRepository.save(newAddress);
      return AddressResponseDto.fromEntity(savedAddress);
    } catch (error) {
      this.logger.error(`Error creating address for user ID ${userId}`, error.stack);
      throw new InternalServerErrorException('Không thể tạo địa chỉ mới.');
    }
  }

  async getAddressesByUserId(userId: number): Promise<Address[]> {
    await this.userHelper.checkUserExist(userId);
    return this.addressesRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAddressById(addressId: number, userId: number): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user: { id: userId } },
    });
    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID ${addressId} thuộc về người dùng này.`);
    }
    return address;
  }
  async findAllAddress(
    queryInput?: string,
    currentInput?: number,
    pageSizeInput?: number,
    sortInput?: string,
  ): Promise<PaginatedResponse<AddressResponseDto>> {
    const query = typeof queryInput === 'string' && queryInput.length <= 100 ? queryInput.trim() : '';
    this.logger.log('findAllAddress called');

    const where: FindOptionsWhere<Address> | FindOptionsWhere<Address>[] = query
      ? { streetAddress: Like(`%${query}%`) }
      : {};

    let order: FindOptionsOrder<Address> = { id: 'DESC' };
    if (sortInput) {
      const [field, direction] = sortInput.split(':');
      const dir = direction?.toUpperCase();
      const allowedSortFields = [
        'id',
        'recipientFullName',
        'streetAddress',
        'ward',
        'district',
        'cityProvince',
        'createdAt',
        'updatedAt',
        'isDefault',
      ];

      if (['ASC', 'DESC'].includes(dir) && allowedSortFields.includes(field)) {
        order = { [field]: dir as 'ASC' | 'DESC' };
      } else {
        this.logger.warn(`Sort không hợp lệ: ${sortInput}. Dùng mặc định.`);
      }
    }

    const takeAll = !pageSizeInput || pageSizeInput === 0;

    let data: Address[];
    let totalItems: number;
    let current = Math.max(1, currentInput ?? 1);
    let pageSize = Math.max(1, Math.min(pageSizeInput ?? 10, 100));

    if (takeAll) {
      data = await this.addressesRepository.find({
        where,
        order,
        relations: ['user'],
      });
      totalItems = data.length;
      current = 1;
      pageSize = totalItems;
    } else {
      [data, totalItems] = await this.addressesRepository.findAndCount({
        where,
        order,
        skip: (current - 1) * pageSize,
        take: pageSize,
        relations: ['user'],
      });
    }

    const totalPages = takeAll ? 1 : Math.ceil(totalItems / pageSize);

    const dataDto = data.map(address =>
      plainToInstance(AddressResponseDto, address, { excludeExtraneousValues: true }),
    );

    this.logger.log('findAllAddress completed');

    return {
      data: dataDto,
      meta: {
        currentPage: current,
        itemCount: dataDto.length,
        itemsPerPage: pageSize,
        totalItems,
        totalPages,
        hasNextPage: current < totalPages,
        hasPreviousPage: current > 1,
      },
    };
  }

  async updateAddress(addressId: number, userId: number, updateAddressData: UpdateAddressZodDto): Promise<Address> {

    const address = await this.getAddressById(addressId, userId);

    if (updateAddressData.isDefault && !address.isDefault) {

      await this.addressesRepository.update(
        { user: { id: userId }, isDefault: true, id: Not(addressId) },
        { isDefault: false },
      );
    }


    Object.assign(address, updateAddressData);

    try {
      return await this.addressesRepository.save(address);
    } catch (error) {
      this.logger.error(`Error updating address ID ${addressId} for user ID ${userId}`, error.stack);
      throw new InternalServerErrorException('Không thể cập nhật địa chỉ.');
    }
  }

  async deleteAddress(addressId: number, userId: number): Promise<void> {
    console.log('Trong service - addressId:', addressId, 'userId:', userId);

    const address = await this.addressesRepository.findOne({
      where: { id: addressId, userId: userId }
    });

    if (!address) {
      console.error('Không tìm thấy địa chỉ hoặc không thuộc về người dùng này.');
      throw new NotFoundException(`Không tìm thấy địa chỉ với ID ${addressId} của bạn để xóa.`);
    }

    await this.addressesRepository.remove(address);


  }

}